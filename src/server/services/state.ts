import type { AppState, Court, Player } from '../../shared/types.js';
import { PLAYERS_PER_COURT } from '../../shared/constants.js';
import { db } from '../db/client.js';
import { players, courts, courtPlayers, stackQueue, finances } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';

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

  const stackRows = db.select().from(stackQueue).orderBy(asc(stackQueue.position)).all();
  const stack = stackRows
    .map((r) => playerMap.get(r.playerId))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      id: p.id,
      name: p.name,
      skill: p.skill as Player['skill'],
      paid: p.paid,
      createdAt: p.createdAt.toISOString(),
      stackGroupId: stackRows.find((r) => r.playerId === p.id)?.groupId ?? null,
    }));

  const [fin] = db.select().from(finances).where(eq(finances.id, 1)).all();

  return {
    players: allPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      skill: p.skill as Player['skill'],
      paid: p.paid,
      createdAt: p.createdAt.toISOString(),
    })),
    courts: courtsState,
    stack,
    finances: { totalIncome: fin?.totalIncome ?? 0 },
    serverTime: new Date().toISOString(),
  };
}
