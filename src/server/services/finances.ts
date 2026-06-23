import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { finances, paymentEvents, players } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { OPEN_PLAY_FEE, getReservationFee } from '../../shared/constants.js';
import type { ReservationRate } from '../../shared/types.js';

function addIncome(amount: number) {
  const [fin] = db.select().from(finances).where(eq(finances.id, 1)).all();
  const current = fin?.totalIncome ?? 0;
  db.update(finances).set({ totalIncome: current + amount }).where(eq(finances.id, 1)).run();
}

export function markPlayerPaid(playerId: string) {
  db.update(players).set({ paid: true }).where(eq(players.id, playerId)).run();
  addIncome(OPEN_PLAY_FEE);
  db.insert(paymentEvents)
    .values({
      id: nanoid(),
      amount: OPEN_PLAY_FEE,
      source: 'player',
      playerId,
      courtId: null,
      createdAt: new Date(),
    })
    .run();
}

export function markPlayerUnpaid(playerId: string) {
  db.update(players).set({ paid: false }).where(eq(players.id, playerId)).run();
}

export function markCourtReservationPaid(courtId: number, rate: ReservationRate) {
  const amount = getReservationFee(rate);
  addIncome(amount);
  db.insert(paymentEvents)
    .values({
      id: nanoid(),
      amount,
      source: 'court_reservation',
      playerId: null,
      courtId,
      createdAt: new Date(),
    })
    .run();
}

