import type { FastifyInstance } from 'fastify';
import { loadAppState } from '../services/state.js';

export async function financeRoutes(app: FastifyInstance) {
  app.get('/api/finances', async () => {
    const state = loadAppState();
    return state.finances;
  });
}
