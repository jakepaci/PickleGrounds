import { db } from '../db/client.js';
import { courts, courtPlayers, players } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { removePlayerFromStack } from './stack-queue.js';
import { MATCH_DURATION_MS, PLAYERS_PER_COURT } from '../../shared/constants.js';
import type { CourtStatus, ReservationRate, SkillCategory } from '../../shared/types.js';
import { assertSkillGroupAllowed } from '../../shared/skill.js';
import {
  getNextReadyGroupPlayerIds,
  reshuffleDeck,
} from './deck-matchmaker.js';

function getSkillsForPlayerIds(playerIds: string[]): SkillCategory[] {
  if (playerIds.length === 0) return [];
  const playerRows = db.select().from(players).where(inArray(players.id, playerIds)).all();
  return playerIds
    .map((id) => playerRows.find((p) => p.id === id)?.skill as SkillCategory | undefined)
    .filter((s): s is SkillCategory => Boolean(s));
}

export function getCourtPlayerIds(courtId: number): string[] {
  const rows = db.select().from(courtPlayers).where(eq(courtPlayers.courtId, courtId)).all();
  return rows.map((r) => r.playerId).filter((id): id is string => id != null);
}

export function clearCourtPlayerSlots(courtId: number) {
  for (let slot = 0; slot < PLAYERS_PER_COURT; slot++) {
    db.update(courtPlayers)
      .set({ playerId: null })
      .where(and(eq(courtPlayers.courtId, courtId), eq(courtPlayers.slot, slot)))
      .run();
  }
}

export function removePlayersFromStack(playerIds: string[]) {
  for (const id of playerIds) {
    removePlayerFromStack(id);
  }
}

/** Block court for a private rental — no players required. */
export function reserveCourt(courtId: number, reservationRate: ReservationRate = 'regular') {
  const [court] = db.select().from(courts).where(eq(courts.id, courtId)).all();
  if (!court) throw new Error('Court not found');
  if (court.status !== 'Idle') throw new Error('Court must be idle');

  db.update(courts)
    .set({
      status: 'Reserved',
      matchEndsAt: null,
      timerPaused: false,
      timerRemainingSeconds: null,
      reservationPaid: false,
      reservationRate,
    })
    .where(eq(courts.id, courtId))
    .run();
  clearCourtPlayerSlots(courtId);
}

/** End open play / reserved session — court goes idle, slots cleared. */
export function endCourtSession(courtId: number) {
  db.update(courts)
    .set({
      status: 'Idle',
      matchEndsAt: null,
      timerPaused: false,
      timerRemainingSeconds: null,
      reservationPaid: false,
      reservationRate: null,
    })
    .where(eq(courts.id, courtId))
    .run();
  clearCourtPlayerSlots(courtId);
}

export function pauseCourtTimer(courtId: number) {
  const [court] = db.select().from(courts).where(eq(courts.id, courtId)).all();
  if (!court) throw new Error('Court not found');
  if (court.status !== 'Occupied') throw new Error('Timer can only be paused on occupied courts');
  if (court.timerPaused) return;
  if (!court.matchEndsAt) throw new Error('No active timer');

  const remaining = Math.max(
    0,
    Math.floor((court.matchEndsAt.getTime() - Date.now()) / 1000),
  );

  db.update(courts)
    .set({
      matchEndsAt: null,
      timerPaused: true,
      timerRemainingSeconds: remaining,
    })
    .where(eq(courts.id, courtId))
    .run();
}

export function resumeCourtTimer(courtId: number) {
  const [court] = db.select().from(courts).where(eq(courts.id, courtId)).all();
  if (!court) throw new Error('Court not found');
  if (!court.timerPaused) return;

  const remaining = court.timerRemainingSeconds ?? 0;

  db.update(courts)
    .set({
      matchEndsAt: new Date(Date.now() + remaining * 1000),
      timerPaused: false,
      timerRemainingSeconds: null,
    })
    .where(eq(courts.id, courtId))
    .run();
}

export function assignPlayersToCourt(
  courtId: number,
  playerIds: string[],
  status: 'Occupied' | 'Reserved',
  reservationRate?: ReservationRate,
  allowSkillMismatch = false,
) {
  if (status === 'Occupied') {
    assertSkillGroupAllowed(getSkillsForPlayerIds(playerIds), allowSkillMismatch);
  }

  const endsAt = null;

  db.update(courts)
    .set({
      status: status as CourtStatus,
      matchEndsAt: endsAt,
      timerPaused: false,
      timerRemainingSeconds: null,
      ...(status === 'Reserved'
        ? { reservationPaid: false, reservationRate: reservationRate ?? 'regular' }
        : { reservationRate: null }),
    })
    .where(eq(courts.id, courtId))
    .run();

  for (let slot = 0; slot < PLAYERS_PER_COURT; slot++) {
    db.update(courtPlayers)
      .set({ playerId: playerIds[slot] })
      .where(and(eq(courtPlayers.courtId, courtId), eq(courtPlayers.slot, slot)))
      .run();
  }

  removePlayersFromStack(playerIds);
}

export function assignPlayerToCourtSlot(
  courtId: number,
  slot: number,
  playerId: string,
  allowSkillMismatch = false,
) {
  if (slot < 0 || slot >= PLAYERS_PER_COURT) {
    throw new Error('Invalid slot');
  }

  const [court] = db.select().from(courts).where(eq(courts.id, courtId)).all();
  if (!court) throw new Error('Court not found');
  if (court.status !== 'Idle' && court.status !== 'Occupied') {
    throw new Error('Court must be idle or occupied');
  }

  const [slotRow] = db
    .select()
    .from(courtPlayers)
    .where(and(eq(courtPlayers.courtId, courtId), eq(courtPlayers.slot, slot)))
    .all();
  if (slotRow?.playerId) {
    throw new Error('Slot is not empty');
  }

  const occupiedElsewhere = db
    .select()
    .from(courtPlayers)
    .all()
    .some((row) => row.playerId === playerId);
  if (occupiedElsewhere) {
    throw new Error('Player is already on a court');
  }

  if (court.status === 'Idle') {
    db.update(courts)
      .set({
        status: 'Occupied',
        matchEndsAt: null,
        timerPaused: false,
        timerRemainingSeconds: null,
        reservationRate: null,
        reservationPaid: false,
      })
      .where(eq(courts.id, courtId))
      .run();
  }

  db.update(courtPlayers)
    .set({ playerId })
    .where(and(eq(courtPlayers.courtId, courtId), eq(courtPlayers.slot, slot)))
    .run();

  const courtPlayerIds = getCourtPlayerIds(courtId);
  if (courtPlayerIds.length >= 2) {
    assertSkillGroupAllowed(getSkillsForPlayerIds(courtPlayerIds), allowSkillMismatch);
  }

  removePlayerFromStack(playerId);
}

export function startCourtTimer(courtId: number) {
  const [court] = db.select().from(courts).where(eq(courts.id, courtId)).all();
  if (!court) throw new Error('Court not found');
  if (court.status !== 'Occupied') throw new Error('Court must be occupied');
  if (getCourtPlayerIds(courtId).length < PLAYERS_PER_COURT) {
    throw new Error(`Need ${PLAYERS_PER_COURT} players on court`);
  }

  db.update(courts)
    .set({
      matchEndsAt: new Date(Date.now() + MATCH_DURATION_MS),
      timerPaused: false,
      timerRemainingSeconds: null,
    })
    .where(eq(courts.id, courtId))
    .run();
}

export function getNextDeckPlayerIds(): string[] {
  return getNextReadyGroupPlayerIds();
}

export function fillCourtFromDeck(courtId: number): { playerIds: string[] } {
  const [court] = db.select().from(courts).where(eq(courts.id, courtId)).all();
  if (!court) {
    throw new Error('Court not found');
  }
  if (court.status !== 'Idle') {
    throw new Error('Court must be idle');
  }

  const playerIds = getNextDeckPlayerIds();
  if (playerIds.length < PLAYERS_PER_COURT) {
    throw new Error(
      `Need a compatible group of ${PLAYERS_PER_COURT} in the deck (max one skill tier apart)`,
    );
  }

  assignPlayersToCourt(courtId, playerIds, 'Occupied');
  return { playerIds };
}

export function autoFillIdleCourts(preferredCourtId?: number): number | undefined {
  const allCourts: (1 | 2 | 3)[] = [1, 2, 3];
  const order: (1 | 2 | 3)[] = preferredCourtId
    ? ([preferredCourtId, ...allCourts.filter((id) => id !== preferredCourtId)] as (1 | 2 | 3)[])
    : allCourts;

  for (const id of order) {
    const [court] = db.select().from(courts).where(eq(courts.id, id)).all();
    if (court?.status !== 'Idle') continue;
    if (getNextReadyGroupPlayerIds().length !== PLAYERS_PER_COURT) continue;

    try {
      fillCourtFromDeck(id);
      return id;
    } catch {
      // not enough compatible players
    }
  }

  return undefined;
}

/** End open play: return players to deck, skill-shuffle, auto-fill idle court. */
export function processOpenPlayCourtEnd(courtId: number): { autoFilledCourtId?: number } {
  const returningIds = getCourtPlayerIds(courtId);
  endCourtSession(courtId);

  if (returningIds.length > 0) {
    reshuffleDeck(returningIds);
  }

  const autoFilledCourtId = autoFillIdleCourts(courtId);
  return { autoFilledCourtId };
}
