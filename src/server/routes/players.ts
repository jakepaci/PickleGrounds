import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { players, stackQueue } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { broadcastState } from '../services/broadcast.js';
import { reshuffleDeck } from '../services/deck-matchmaker.js';
import {
  lockStackGroup,
  moveDeckGroup,
  moveDeckGroupToIndex,
  removePlayerFromStack,
  reorderStackPlayer,
  unlockStackGroup,
} from '../services/stack-queue.js';
import { skillCategories, type SkillCategory } from '../../shared/types.js';
import { PLAYERS_PER_COURT } from '../../shared/constants.js';

export async function playerRoutes(app: FastifyInstance) {
  app.post<{ Body: { name: string; skill: SkillCategory } }>('/api/players', async (req, reply) => {
    const { name, skill } = req.body;
    if (!name?.trim()) {
      return reply.code(400).send({ error: 'Name is required' });
    }
    if (!skillCategories.includes(skill)) {
      return reply.code(400).send({ error: 'Invalid skill category' });
    }

    const id = nanoid();
    db.insert(players)
      .values({ id, name: name.trim(), skill, paid: false, createdAt: new Date() })
      .run();

    broadcastState();
    return { id };
  });

  app.post<{ Params: { id: string } }>('/api/players/:id/mark-paid', async (req, reply) => {
    const { id } = req.params;
    const [player] = db.select().from(players).where(eq(players.id, id)).all();
    if (!player) {
      return reply.code(404).send({ error: 'Player not found' });
    }
    if (player.paid) {
      return { ok: true, alreadyPaid: true };
    }

    const { markPlayerPaid } = await import('../services/finances.js');
    markPlayerPaid(id);
    broadcastState();
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/players/:id/mark-unpaid', async (req, reply) => {
    const { id } = req.params;
    const [player] = db.select().from(players).where(eq(players.id, id)).all();
    if (!player) {
      return reply.code(404).send({ error: 'Player not found' });
    }
    if (!player.paid) {
      return { ok: true, alreadyUnpaid: true };
    }

    const { markPlayerUnpaid } = await import('../services/finances.js');
    markPlayerUnpaid(id);
    broadcastState();
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/api/players/:id/stack', async (req, reply) => {
    const { id } = req.params;
    const [player] = db.select().from(players).where(eq(players.id, id)).all();
    if (!player) {
      return reply.code(404).send({ error: 'Player not found' });
    }

    const existing = db.select().from(stackQueue).where(eq(stackQueue.playerId, id)).all();
    if (existing.length > 0) {
      return reply.code(400).send({ error: 'Player already in stack' });
    }

    const rows = db.select().from(stackQueue).orderBy(asc(stackQueue.position)).all();
    const nextPosition = rows.length > 0 ? Math.max(...rows.map((r) => r.position)) + 1 : 0;
    db.insert(stackQueue).values({ position: nextPosition, playerId: id }).run();

    broadcastState();
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>('/api/players/:id/stack', async (req) => {
    const { id } = req.params;
    removePlayerFromStack(id);
    broadcastState();
    return { ok: true };
  });

  app.post('/api/stack/reshuffle', async () => {
    reshuffleDeck([]);
    broadcastState();
    return { ok: true };
  });

  app.post<{ Body: { groupIndex: number; direction: 'up' | 'down' } }>(
    '/api/stack/move-group',
    async (req, reply) => {
      const { groupIndex, direction } = req.body;
      if (groupIndex < 0 || (direction !== 'up' && direction !== 'down')) {
        return reply.code(400).send({ error: 'Invalid move request' });
      }
      try {
        moveDeckGroup(groupIndex, direction);
        broadcastState();
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to move group';
        return reply.code(400).send({ error: message });
      }
    },
  );

  app.post<{ Body: { fromGroupIndex: number; toGroupIndex: number } }>(
    '/api/stack/move-group-to',
    async (req, reply) => {
      const { fromGroupIndex, toGroupIndex } = req.body;
      if (
        typeof fromGroupIndex !== 'number' ||
        typeof toGroupIndex !== 'number' ||
        fromGroupIndex < 0 ||
        toGroupIndex < 0
      ) {
        return reply.code(400).send({ error: 'fromGroupIndex and toGroupIndex required' });
      }
      try {
        moveDeckGroupToIndex(fromGroupIndex, toGroupIndex);
        broadcastState();
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to move group';
        return reply.code(400).send({ error: message });
      }
    },
  );

  app.post<{ Body: { playerId: string; toIndex: number } }>(
    '/api/stack/reorder',
    async (req, reply) => {
      const { playerId, toIndex } = req.body;
      if (!playerId || typeof toIndex !== 'number' || toIndex < 0) {
        return reply.code(400).send({ error: 'playerId and toIndex required' });
      }
      try {
        reorderStackPlayer(playerId, toIndex);
        broadcastState();
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to reorder';
        return reply.code(400).send({ error: message });
      }
    },
  );

  app.post<{ Body: { playerIds: string[] } }>('/api/stack/keep-together', async (req, reply) => {
    const { playerIds } = req.body;
    if (playerIds.length !== PLAYERS_PER_COURT) {
      return reply.code(400).send({ error: `Need exactly ${PLAYERS_PER_COURT} players` });
    }
    try {
      const result = lockStackGroup(playerIds);
      broadcastState();
      return { ok: true, ...result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to lock group';
      return reply.code(400).send({ error: message });
    }
  });

  app.post<{ Body: { groupId: string } }>('/api/stack/ungroup', async (req, reply) => {
    const { groupId } = req.body;
    if (!groupId) {
      return reply.code(400).send({ error: 'groupId required' });
    }
    unlockStackGroup(groupId);
    broadcastState();
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>('/api/players/:id', async (req, reply) => {
    const { id } = req.params;
    const [player] = db.select().from(players).where(eq(players.id, id)).all();
    if (!player) {
      return reply.code(404).send({ error: 'Player not found' });
    }
    removePlayerFromStack(id);
    db.delete(players).where(eq(players.id, id)).run();
    broadcastState();
    return { ok: true };
  });
}
