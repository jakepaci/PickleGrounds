import { db } from '../db/client.js';
import { players } from '../db/schema.js';
import { inArray } from 'drizzle-orm';
import { PLAYERS_PER_COURT } from '../../shared/constants.js';
import type { SkillCategory } from '../../shared/types.js';
import { isValidSkillGroup } from '../../shared/skill.js';
import {
  getOrderedStackRows,
  rebuildStackQueue,
  type StackRow,
} from './stack-queue.js';

type PoolPlayer = { id: string; skill: SkillCategory; waitOrder: number };

export function isValidGroup(group: PoolPlayer[]): boolean {
  return isValidSkillGroup(group.map((p) => p.skill));
}

/** Greedy FIFO groups with random partner mix among compatible players. */
export function buildSkillGroups(pool: PoolPlayer[]): PoolPlayer[][] {
  let remaining = [...pool].sort((a, b) => a.waitOrder - b.waitOrder);
  const groups: PoolPlayer[][] = [];

  while (remaining.length > 0) {
    const anchor = remaining.shift()!;
    const group: PoolPlayer[] = [anchor];

    while (group.length < PLAYERS_PER_COURT) {
      const candidates = remaining
        .filter((p) => isValidGroup([...group, p]))
        .sort((a, b) => a.waitOrder - b.waitOrder);

      if (candidates.length === 0) break;

      const window = candidates.slice(0, Math.min(5, candidates.length));
      const picked = window[Math.floor(Math.random() * window.length)]!;
      group.push(picked);
      remaining = remaining.filter((p) => p.id !== picked.id);
    }

    groups.push(group);
  }

  const full = groups.filter((g) => g.length === PLAYERS_PER_COURT);
  const partial = groups.filter((g) => g.length < PLAYERS_PER_COURT);
  return [...full, ...partial];
}

function extractLockedBlocks(rows: StackRow[]): { blocks: StackRow[][]; loose: StackRow[] } {
  const blocks: StackRow[][] = [];
  const loose: StackRow[] = [];
  const usedGroups = new Set<string>();

  for (let i = 0; i < rows.length; ) {
    const row = rows[i]!;
    if (row.groupId && !usedGroups.has(row.groupId)) {
      const block = rows.filter((r) => r.groupId === row.groupId);
      if (block.length === PLAYERS_PER_COURT) {
        blocks.push(block);
        usedGroups.add(row.groupId);
        i += block.length;
        continue;
      }
      for (const r of block) {
        loose.push({ ...r, groupId: null });
      }
      i += block.length;
      continue;
    }
    if (row.groupId) {
      i++;
      continue;
    }
    loose.push(row);
    i++;
  }

  return { blocks, loose };
}

function mergeLockedAndShuffled(
  lockedBlocks: StackRow[][],
  shuffledLooseIds: string[],
  groupIdByPlayer: Map<string, string | null>,
): { playerId: string; groupId: string | null }[] {
  const result: { playerId: string; groupId: string | null }[] = [];
  let looseIdx = 0;
  let lockIdx = 0;
  let wait = 0;

  const lockedQueue = lockedBlocks.map((block) => ({
    block,
    waitOrder: block[0]!.position,
  }));

  while (lockIdx < lockedQueue.length || looseIdx < shuffledLooseIds.length) {
    const nextLock = lockedQueue[lockIdx];
    const takeLock =
      nextLock &&
      (looseIdx >= shuffledLooseIds.length || nextLock.waitOrder <= wait);

    if (takeLock) {
      for (const row of nextLock.block) {
        result.push({ playerId: row.playerId, groupId: row.groupId });
      }
      lockIdx++;
      wait++;
      continue;
    }

    const id = shuffledLooseIds[looseIdx++]!;
    result.push({ playerId: id, groupId: groupIdByPlayer.get(id) ?? null });
    wait++;
  }

  return result;
}

/** Merge deck + returning players, regroup by skill rules, preserve locked foursomes. */
export function reshuffleDeck(returningPlayerIds: string[] = []) {
  const stackRows = getOrderedStackRows();
  const { blocks: lockedBlocks, loose: looseRows } = extractLockedBlocks(stackRows);

  const looseIds = [...looseRows.map((r) => r.playerId)];
  for (const id of returningPlayerIds) {
    if (!looseIds.includes(id)) looseIds.push(id);
  }

  if (looseIds.length === 0 && lockedBlocks.length === 0) return;

  const playerRows =
    looseIds.length > 0
      ? db.select().from(players).where(inArray(players.id, looseIds)).all()
      : [];
  const skillById = new Map(playerRows.map((p) => [p.id, p.skill as SkillCategory]));

  const pool: PoolPlayer[] = looseIds
    .filter((id) => skillById.has(id))
    .map((id, index) => ({
      id,
      skill: skillById.get(id)!,
      waitOrder: index,
    }));

  const shuffledLooseIds = buildSkillGroups(pool).flat().map((p) => p.id);
  const groupIdByPlayer = new Map(looseRows.map((r) => [r.playerId, r.groupId]));

  const merged = mergeLockedAndShuffled(lockedBlocks, shuffledLooseIds, groupIdByPlayer);
  rebuildStackQueue(merged);
}

/** First complete skill-valid group at the front of the queue (full groups are queued first). */
export function getNextReadyGroupPlayerIds(): string[] {
  const stackRows = getOrderedStackRows();
  if (stackRows.length < PLAYERS_PER_COURT) return [];

  const firstFourIds = stackRows.slice(0, PLAYERS_PER_COURT).map((r) => r.playerId);
  const playerRows = db.select().from(players).where(inArray(players.id, firstFourIds)).all();
  const skillById = new Map(playerRows.map((p) => [p.id, p.skill as SkillCategory]));

  const group: PoolPlayer[] = firstFourIds.map((id, waitOrder) => ({
    id,
    skill: skillById.get(id)!,
    waitOrder,
  }));

  if (!isValidGroup(group)) return [];
  return firstFourIds;
}
