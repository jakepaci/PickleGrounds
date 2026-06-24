import type { FastifyInstance } from 'fastify';
import { broadcastState } from '../services/broadcast.js';
import { startNewSession } from '../services/session.js';

export async function sessionRoutes(app: FastifyInstance) {
  app.post('/api/session/start-new', async () => {
    startNewSession();
    broadcastState();
    return { ok: true };
  });
}
