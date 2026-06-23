import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { players, stackQueue } from '../db/schema.js';
import { asc, eq, inArray } from 'drizzle-orm';
import { PLAYERS_PER_COURT } from '../../shared/constants.js';
import type { SkillCategory } from '../../shared/types.js';
import { isValidSkillGroup } from '../../shared/skill.js';

export type StackRow = {
  position: number;
  playerId: string;
  groupId: string | null;
};

export function getOrderedStackRows(): StackRow[] {
  return db
    .select()
    .from(stackQueue)
    .orderBy(asc(stackQueue.position))
    .all()
    .map((r) => ({
      position: r.position,
      playerId: r.playerId,
      groupId: r.groupId ?? null,
    }));
}

export function rebuildStackQueue(
  entries: { playerId: string; groupId?: string | null }[],
) {
  db.delete(stackQueue).run();
  for (let position = 0; position < entries.length; position++) {
    const entry = entries[position]!;
    db.insert(stackQueue)
      .values({
        position,
        playerId: entry.playerId,
        groupId: entry.groupId ?? null,
      })
      .run();
  }
}

export function clearStackGroup(groupId: string) {
  const rows = getOrderedStackRows().filter((r) => r.groupId === groupId);
  for (const row of rows) {
    db.update(stackQueue)
      .set({ groupId: null })
      .where(eq(stackQueue.playerId, row.playerId))
      .run();
  }
}

export function removePlayerFromStack(playerId: string) {
  const [row] = db.select().from(stackQueue).where(eq(stackQueue.playerId, playerId)).all();
  if (!row) return;
  const groupId = row.groupId;
  db.delete(stackQueue).where(eq(stackQueue.playerId, playerId)).run();
  if (groupId) clearStackGroup(groupId);
}

export function moveDeckGroup(groupIndex: number, direction: 'up' | 'down') {
  const rows = getOrderedStackRows();
  const start = groupIndex * PLAYERS_PER_COURT;
  if (start >= rows.length) return;

  const end = Math.min(start + PLAYERS_PER_COURT, rows.length);
  const block = rows.slice(start, end);

  if (direction === 'up') {
    if (groupIndex === 0) return;
    const prevStart = (groupIndex - 1) * PLAYERS_PER_COURT;
    const rebuilt = [
      ...rows.slice(0, prevStart),
      ...block,
      ...rows.slice(prevStart, start),
      ...rows.slice(end),
    ];
    rebuildStackQueue(rebuilt.map((r) => ({ playerId: r.playerId, groupId: r.groupId })));
    return;
  }

  if (end >= rows.length) return;
  const nextEnd = Math.min(end + PLAYERS_PER_COURT, rows.length);
  const rebuilt = [
    ...rows.slice(0, start),
    ...rows.slice(end, nextEnd),
    ...block,
    ...rows.slice(nextEnd),
  ];
  rebuildStackQueue(rebuilt.map((r) => ({ playerId: r.playerId, groupId: r.groupId })));
}

/** Move an entire deck group to a new position in the queue (0-based group index). */
export function moveDeckGroupToIndex(fromGroupIndex: number, toGroupIndex: number) {
  const rows = getOrderedStackRows();
  if (rows.length === 0) return;

  const groups: StackRow[][] = [];
  for (let i = 0; i < rows.length; i += PLAYERS_PER_COURT) {
    groups.push(rows.slice(i, Math.min(i + PLAYERS_PER_COURT, rows.length)));
  }

  if (fromGroupIndex < 0 || fromGroupIndex >= groups.length) {
    throw new Error('Invalid source group');
  }
  if (toGroupIndex < 0 || toGroupIndex >= groups.length) {
    throw new Error('Invalid target group');
  }
  if (fromGroupIndex === toGroupIndex) return;

  const [moved] = groups.splice(fromGroupIndex, 1);
  groups.splice(toGroupIndex, 0, moved!);

  const rebuilt = groups.flat();
  rebuildStackQueue(rebuilt.map((r) => ({ playerId: r.playerId, groupId: r.groupId })));
}

export function lockStackGroup(playerIds: string[]) {
  if (playerIds.length !== PLAYERS_PER_COURT) {
    throw new Error(`Need exactly ${PLAYERS_PER_COURT} players`);
  }

  const rows = getOrderedStackRows();
  const idSet = new Set(playerIds);
  const inStack = rows.filter((r) => idSet.has(r.playerId));
  if (inStack.length !== PLAYERS_PER_COURT) {
    throw new Error('All players must be in the deck');
  }

  const playerRows = db.select().from(players).where(inArray(players.id, playerIds)).all();
  const skills = playerRows.map((p) => p.skill as SkillCategory);
  if (!isValidSkillGroup(skills)) {
    throw new Error('Group must be within one skill tier (max one tier apart)');
  }

  const orderedIds = rows.map((r) => r.playerId);
  const indices = playerIds.map((id) => orderedIds.indexOf(id)).sort((a, b) => a - b);
  const insertAt = indices[0]!;
  const without = orderedIds.filter((id) => !idSet.has(id));
  const sortedGroupIds = playerIds.sort(
    (a, b) => orderedIds.indexOf(a) - orderedIds.indexOf(b),
  );
  without.splice(insertAt, 0, ...sortedGroupIds);

  const groupId = nanoid();
  rebuildStackQueue(
    without.map((playerId) => ({
      playerId,
      groupId: idSet.has(playerId) ? groupId : null,
    })),
  );

  return { groupId };
}

export function unlockStackGroup(groupId: string) {
  clearStackGroup(groupId);
}

/** Move one player to a new position in the queue (0-based). Ungroups if locked. */
export function reorderStackPlayer(playerId: string, toIndex: number) {
  let rows = getOrderedStackRows();
  const fromIndex = rows.findIndex((r) => r.playerId === playerId);
  if (fromIndex === -1) {
    throw new Error('Player is not in the deck');
  }
  if (toIndex < 0 || toIndex >= rows.length) {
    throw new Error('Invalid position');
  }
  if (fromIndex === toIndex) return;

  const moving = rows[fromIndex]!;
  if (moving.groupId) {
    const groupId = moving.groupId;
    rows = rows.map((r) => (r.groupId === groupId ? { ...r, groupId: null } : r));
  }

  const without = rows.filter((r) => r.playerId !== playerId);
  without.splice(toIndex, 0, { playerId: moving.playerId, groupId: null });
  rebuildStackQueue(
    without.map((r) => ({ playerId: r.playerId, groupId: r.groupId })),
  );
}
