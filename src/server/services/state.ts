import type { AppState, Court, Player, StackDeckGroup } from '../../shared/types.js';
import { PLAYERS_PER_COURT } from '../../shared/constants.js';
import { db } from '../db/client.js';
import { players, courts, courtPlayers, finances } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { getDeckGroups } from './stack-queue.js';

function toPlayer(
  p: { id: string; name: string; skill: string; paid: boolean; createdAt: Date },
  stackGroupId?: string | null,
): Player {
  return {
    id: p.id,
    name: p.name,
    skill: p.skill as Player['skill'],
    paid: p.paid,
    createdAt: p.createdAt.toISOString(),
    ...(stackGroupId != null ? { stackGroupId } : {}),
  };
}

export function loadAppState(): AppState {
  const allPlayers = db.select().from(players).all();
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

  const courtRows = db.select().from(courts).orderBy(asc(courts.id)).all();
  const slotRows = db.select().from(courtPlayers).all();

  const courtsState: Court[] = courtRows.map((c) => {
    const slots = Array.from({ length: PLAYERS_PER_COURT }, (_, slot) => {
      const row = slotRows.find((s) => s.courtId === c.id && s.slot === slot);
      const p = row?.playerId ? playerMap.get(row.playerId) : null;
      return {
        slot,
        player: p
          ? {
              id: p.id,
              name: p.name,
              skill: p.skill as Player['skill'],
              paid: p.paid,
              createdAt: p.createdAt.toISOString(),
            }
          : null,
      };
    });

    const secondsRemaining =
      c.timerPaused && c.timerRemainingSeconds != null
        ? c.timerRemainingSeconds
        : c.matchEndsAt
          ? Math.max(0, Math.floor((c.matchEndsAt.getTime() - Date.now()) / 1000))
          : 0;

    return {
      id: c.id as 1 | 2 | 3,
      status: c.status as Court['status'],
      reservationPaid: c.reservationPaid,
      reservationRate: (c.reservationRate as Court['reservationRate']) ?? null,
      players: slots,
      secondsRemaining,
      timerPaused: c.timerPaused,
      timerStarted: c.matchEndsAt != null || c.timerPaused,
    };
  });

  const stackGroups: StackDeckGroup[] = getDeckGroups().map((group) => {
    const slots = Array.from({ length: PLAYERS_PER_COURT }, (_, deckSlot) => {
      const row = group.find((r) => r.deckSlot === deckSlot);
      if (!row?.playerId) return null;
      const p = playerMap.get(row.playerId);
      return p ? toPlayer(p, row.groupId) : null;
    });

    return { id: group[0]!.deckGroupId, slots };
  });

  const stack = stackGroups.flatMap((g) =>
    g.slots.filter((p): p is Player => p != null),
  );

  const [fin] = db.select().from(finances).where(eq(finances.id, 1)).all();

  return {
    players: allPlayers.map((p) => toPlayer(p)),
    courts: courtsState,
    stack,
    stackGroups,
    finances: { totalIncome: fin?.totalIncome ?? 0 },
    serverTime: new Date().toISOString(),
  };
}
