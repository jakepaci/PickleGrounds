import { db } from '../db/client.js';
import { players } from '../db/schema.js';
import { inArray } from 'drizzle-orm';
import { PLAYERS_PER_COURT } from '../../shared/constants.js';
import type { SkillCategory } from '../../shared/types.js';
import { isValidSkillGroup } from '../../shared/skill.js';
import { getDeckGroups, rebuildStackQueue, type StackRow } from './stack-queue.js';

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

function extractLockedBlocks(groups: StackRow[][]): { blocks: StackRow[][]; loose: StackRow[] } {
  const blocks: StackRow[][] = [];
  const loose: StackRow[] = [];

  for (const group of groups) {
    const playersInGroup = group.filter((r) => r.playerId);
    const lockId = group.find((r) => r.groupId)?.groupId;
    if (
      lockId &&
      playersInGroup.length === PLAYERS_PER_COURT &&
      group.every((r) => !r.playerId || r.groupId === lockId)
    ) {
      blocks.push(group);
      continue;
    }
    for (const row of group) {
      if (row.playerId) loose.push({ ...row, groupId: null });
    }
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
    waitOrder: block[0]!.deckGroupOrder,
  }));

  while (lockIdx < lockedQueue.length || looseIdx < shuffledLooseIds.length) {
    const nextLock = lockedQueue[lockIdx];
    const takeLock =
      nextLock &&
      (looseIdx >= shuffledLooseIds.length || nextLock.waitOrder <= wait);

    if (takeLock) {
      for (const row of nextLock.block) {
        if (row.playerId) {
          result.push({ playerId: row.playerId, groupId: row.groupId });
        }
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
  const deckGroups = getDeckGroups();
  const { blocks: lockedBlocks, loose: looseRows } = extractLockedBlocks(deckGroups);

  const looseIds = [...looseRows.map((r) => r.playerId!)];
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
  const groupIdByPlayer = new Map(
    looseRows.filter((r) => r.playerId).map((r) => [r.playerId!, r.groupId]),
  );

  const merged = mergeLockedAndShuffled(lockedBlocks, shuffledLooseIds, groupIdByPlayer);
  rebuildStackQueue(merged);
}

/** First skill-valid foursome in queue order (by deck group). */
export function getNextReadyGroupPlayerIds(): string[] {
  const deckGroups = getDeckGroups();

  for (const group of deckGroups) {
    const playerIds = Array.from({ length: PLAYERS_PER_COURT }, (_, slot) => {
      return group.find((r) => r.deckSlot === slot)?.playerId ?? null;
    });

    if (playerIds.some((id) => !id)) continue;

    const ids = playerIds as string[];
    const playerRows = db.select().from(players).where(inArray(players.id, ids)).all();
    const skillById = new Map(playerRows.map((p) => [p.id, p.skill as SkillCategory]));

    const pool: PoolPlayer[] = ids.map((id, waitOrder) => ({
      id,
      skill: skillById.get(id)!,
      waitOrder,
    }));

    if (pool.every((p) => p.skill) && isValidGroup(pool)) {
      return ids;
    }
  }

  return [];
}
