import type { FastifyInstance } from 'fastify';
import { broadcastState } from '../services/broadcast.js';
import { startNewSession } from '../services/session.js';

export async function sessionRoutes(app: FastifyInstance) {
  app.post<{ Body: { removePlayers?: boolean } }>('/api/session/start-new', async (req) => {
    startNewSession({ removePlayers: req.body?.removePlayers === true });
    broadcastState();
    return { ok: true };
  });
}
