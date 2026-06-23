import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { courts } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { broadcastState } from '../services/broadcast.js';
import { PLAYERS_PER_COURT, reservationRates } from '../../shared/constants.js';
import { markCourtReservationPaid } from '../services/finances.js';
import {
  assignPlayersToCourt,
  endCourtSession,
  fillCourtFromDeck,
  pauseCourtTimer,
  processOpenPlayCourtEnd,
  resumeCourtTimer,
  startCourtTimer,
} from '../services/court-session.js';
import type { ReservationRate } from '../../shared/types.js';

function parseCourtId(raw: string, reply: { code: (n: number) => { send: (b: unknown) => unknown } }) {
  const courtId = Number(raw);
  if (courtId < 1 || courtId > 3) {
    reply.code(400).send({ error: 'Invalid court id' });
    return null;
  }
  return courtId as 1 | 2 | 3;
}

export async function courtRoutes(app: FastifyInstance) {
  app.post<{
    Params: { id: string };
    Body: { playerIds: string[]; status?: 'Reserved' | 'Occupied'; reservationRate?: ReservationRate };
  }>('/api/courts/:id/assign', async (req, reply) => {
    const courtId = parseCourtId(req.params.id, reply);
    if (!courtId) return;

    const { playerIds, status = 'Occupied', reservationRate = 'regular' } = req.body;

    if (playerIds.length !== PLAYERS_PER_COURT) {
      return reply.code(400).send({ error: 'Exactly 4 players required' });
    }
    if (status === 'Reserved' && !reservationRates.includes(reservationRate)) {
      return reply.code(400).send({ error: 'Invalid reservation rate' });
    }

    assignPlayersToCourt(courtId, playerIds, status, reservationRate);
    broadcastState();
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/courts/:id/clear', async (req, reply) => {
    const courtId = parseCourtId(req.params.id, reply);
    if (!courtId) return;

    endCourtSession(courtId);
    broadcastState();
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/courts/:id/end-game', async (req, reply) => {
    const courtId = parseCourtId(req.params.id, reply);
    if (!courtId) return;

    const [court] = db.select().from(courts).where(eq(courts.id, courtId)).all();
    if (!court) {
      return reply.code(404).send({ error: 'Court not found' });
    }
    if (court.status === 'Idle') {
      return { ok: true, alreadyIdle: true };
    }

    if (court.status === 'Occupied') {
      processOpenPlayCourtEnd(courtId);
    } else {
      endCourtSession(courtId);
    }

    broadcastState();
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/courts/:id/fill-from-deck', async (req, reply) => {
    const courtId = parseCourtId(req.params.id, reply);
    if (!courtId) return;

    try {
      const result = fillCourtFromDeck(courtId);
      broadcastState();
      return { ok: true, ...result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fill from deck';
      return reply.code(400).send({ error: message });
    }
  });

  app.post<{ Params: { id: string } }>('/api/courts/:id/start-timer', async (req, reply) => {
    const courtId = parseCourtId(req.params.id, reply);
    if (!courtId) return;

    try {
      startCourtTimer(courtId);
      broadcastState();
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start timer';
      return reply.code(400).send({ error: message });
    }
  });

  app.post<{ Params: { id: string } }>('/api/courts/:id/pause-timer', async (req, reply) => {
    const courtId = parseCourtId(req.params.id, reply);
    if (!courtId) return;

    try {
      pauseCourtTimer(courtId);
      broadcastState();
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pause timer';
      return reply.code(400).send({ error: message });
    }
  });

  app.post<{ Params: { id: string } }>('/api/courts/:id/resume-timer', async (req, reply) => {
    const courtId = parseCourtId(req.params.id, reply);
    if (!courtId) return;

    try {
      resumeCourtTimer(courtId);
      broadcastState();
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resume timer';
      return reply.code(400).send({ error: message });
    }
  });

  app.post<{ Params: { id: string } }>('/api/courts/:id/mark-paid', async (req, reply) => {
    const courtId = parseCourtId(req.params.id, reply);
    if (!courtId) return;

    const [court] = db.select().from(courts).where(eq(courts.id, courtId)).all();
    if (!court) {
      return reply.code(404).send({ error: 'Court not found' });
    }
    if (court.reservationPaid) {
      return { ok: true, alreadyPaid: true };
    }

    const rate = (court.reservationRate ?? 'regular') as ReservationRate;

    db.update(courts).set({ reservationPaid: true }).where(eq(courts.id, courtId)).run();
    markCourtReservationPaid(courtId, rate);
    broadcastState();
    return { ok: true };
  });
}
