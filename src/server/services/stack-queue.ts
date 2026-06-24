import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { courtPlayers, players, stackQueue } from '../db/schema.js';
import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';
import { PLAYERS_PER_COURT } from '../../shared/constants.js';
import type { SkillCategory } from '../../shared/types.js';
import { assertSkillGroupAllowed } from '../../shared/skill.js';

export type StackRow = {
  deckGroupId: string;
  deckGroupOrder: number;
  deckSlot: number;
  playerId: string | null;
  groupId: string | null;
};

export function getOrderedStackRows(): StackRow[] {
  return db
    .select()
    .from(stackQueue)
    .orderBy(asc(stackQueue.deckGroupOrder), asc(stackQueue.deckSlot))
    .all()
    .map((r) => ({
      deckGroupId: r.deckGroupId,
      deckGroupOrder: r.deckGroupOrder,
      deckSlot: r.deckSlot,
      playerId: r.playerId ?? null,
      groupId: r.groupId ?? null,
    }));
}

/** Deck groups in queue order; each inner array is rows for one visual card. */
export function getDeckGroups(): StackRow[][] {
  const rows = getOrderedStackRows();
  const byId = new Map<string, StackRow[]>();
  for (const row of rows) {
    const group = byId.get(row.deckGroupId) ?? [];
    group.push(row);
    byId.set(row.deckGroupId, group);
  }
  return [...byId.values()].sort(
    (a, b) => (a[0]?.deckGroupOrder ?? 0) - (b[0]?.deckGroupOrder ?? 0),
  );
}

function slotRow(
  groups: StackRow[][],
  deckGroupOrder: number,
  deckSlot: number,
): StackRow | undefined {
  const group = groups[deckGroupOrder];
  return group?.find((r) => r.deckSlot === deckSlot);
}

function normalizeDeckGroupOrder() {
  const groups = getDeckGroups();
  for (let order = 0; order < groups.length; order++) {
    for (const row of groups[order]!) {
      if (row.deckGroupOrder !== order) {
        db.update(stackQueue)
          .set({ deckGroupOrder: order })
          .where(
            and(
              eq(stackQueue.deckGroupId, row.deckGroupId),
              eq(stackQueue.deckSlot, row.deckSlot),
            ),
          )
          .run();
      }
    }
  }
}

function purgeEmptyDeckGroups() {
  const groups = getDeckGroups();
  for (const group of groups) {
    const hasPlayer = group.some((r) => r.playerId != null);
    if (!hasPlayer) {
      for (const row of group) {
        db.delete(stackQueue)
          .where(
            and(
              eq(stackQueue.deckGroupId, row.deckGroupId),
              eq(stackQueue.deckSlot, row.deckSlot),
            ),
          )
          .run();
      }
    }
  }
  normalizeDeckGroupOrder();
}

function setSlotPlayer(
  deckGroupId: string,
  deckSlot: number,
  playerId: string | null,
  groupId: string | null = null,
) {
  db.update(stackQueue)
    .set({ playerId, groupId })
    .where(and(eq(stackQueue.deckGroupId, deckGroupId), eq(stackQueue.deckSlot, deckSlot)))
    .run();
}

function ensureSlotRow(deckGroupOrder: number, deckSlot: number): StackRow {
  let groups = getDeckGroups();
  while (groups.length <= deckGroupOrder) {
    const deckGroupId = nanoid();
    const order = groups.length;
    db.insert(stackQueue)
      .values({
        deckGroupId,
        deckGroupOrder: order,
        deckSlot,
        playerId: null,
        groupId: null,
      })
      .run();
    groups = getDeckGroups();
  }

  const group = groups[deckGroupOrder]!;
  const existing = group.find((r) => r.deckSlot === deckSlot);
  if (existing) return existing;

  const deckGroupId = group[0]!.deckGroupId;
  db.insert(stackQueue)
    .values({
      deckGroupId,
      deckGroupOrder,
      deckSlot,
      playerId: null,
      groupId: null,
    })
    .run();
  return slotRow(getDeckGroups(), deckGroupOrder, deckSlot)!;
}

export function rebuildStackQueue(
  entries: { playerId: string; groupId?: string | null }[],
) {
  db.delete(stackQueue).run();
  for (let i = 0; i < entries.length; i += PLAYERS_PER_COURT) {
    const deckGroupId = nanoid();
    const deckGroupOrder = i / PLAYERS_PER_COURT;
    const chunk = entries.slice(i, i + PLAYERS_PER_COURT);
    for (let deckSlot = 0; deckSlot < chunk.length; deckSlot++) {
      const entry = chunk[deckSlot]!;
      db.insert(stackQueue)
        .values({
          deckGroupId,
          deckGroupOrder,
          deckSlot,
          playerId: entry.playerId,
          groupId: entry.groupId ?? null,
        })
        .run();
    }
  }
}

export function clearStackGroup(groupId: string) {
  const rows = getOrderedStackRows().filter((r) => r.groupId === groupId);
  for (const row of rows) {
    db.update(stackQueue)
      .set({ groupId: null })
      .where(
        and(eq(stackQueue.deckGroupId, row.deckGroupId), eq(stackQueue.deckSlot, row.deckSlot)),
      )
      .run();
  }
}

/** Admin remove — leave an empty slot on the group card. */
export function vacateStackSlot(playerId: string) {
  const row = getOrderedStackRows().find((r) => r.playerId === playerId);
  if (!row) return;
  if (row.groupId) clearStackGroup(row.groupId);
  setSlotPlayer(row.deckGroupId, row.deckSlot, null, null);
  purgeEmptyDeckGroups();
}

/** Court assign — remove player row entirely from the queue. */
export function removePlayerFromStack(playerId: string) {
  const row = getOrderedStackRows().find((r) => r.playerId === playerId);
  if (!row) return;
  if (row.groupId) clearStackGroup(row.groupId);
  db.delete(stackQueue)
    .where(
      and(eq(stackQueue.deckGroupId, row.deckGroupId), eq(stackQueue.deckSlot, row.deckSlot)),
    )
    .run();
  purgeEmptyDeckGroups();
}

export function appendPlayerToStack(playerId: string) {
  const groups = getDeckGroups();
  if (groups.length > 0) {
    const last = groups[groups.length - 1]!;
    const deckGroupId = last[0]!.deckGroupId;
    const deckGroupOrder = last[0]!.deckGroupOrder;
    for (let deckSlot = 0; deckSlot < PLAYERS_PER_COURT; deckSlot++) {
      const row = last.find((r) => r.deckSlot === deckSlot);
      if (!row?.playerId) {
        if (row) {
          setSlotPlayer(deckGroupId, deckSlot, playerId, null);
        } else {
          db.insert(stackQueue)
            .values({ deckGroupId, deckGroupOrder, deckSlot, playerId, groupId: null })
            .run();
        }
        return;
      }
    }
  }

  const deckGroupId = nanoid();
  db.insert(stackQueue)
    .values({
      deckGroupId,
      deckGroupOrder: groups.length,
      deckSlot: 0,
      playerId,
      groupId: null,
    })
    .run();
}

export function moveDeckGroup(groupIndex: number, direction: 'up' | 'down') {
  const groups = getDeckGroups();
  if (groupIndex < 0 || groupIndex >= groups.length) return;

  const targetIndex = direction === 'up' ? groupIndex - 1 : groupIndex + 1;
  if (targetIndex < 0 || targetIndex >= groups.length) return;

  const orderA = groups[groupIndex]![0]!.deckGroupOrder;
  const orderB = groups[targetIndex]![0]!.deckGroupOrder;

  for (const row of groups[groupIndex]!) {
    db.update(stackQueue)
      .set({ deckGroupOrder: orderB })
      .where(
        and(eq(stackQueue.deckGroupId, row.deckGroupId), eq(stackQueue.deckSlot, row.deckSlot)),
      )
      .run();
  }
  for (const row of groups[targetIndex]!) {
    db.update(stackQueue)
      .set({ deckGroupOrder: orderA })
      .where(
        and(eq(stackQueue.deckGroupId, row.deckGroupId), eq(stackQueue.deckSlot, row.deckSlot)),
      )
      .run();
  }
}

export function moveDeckGroupToIndex(fromGroupIndex: number, toGroupIndex: number) {
  const groups = getDeckGroups();
  if (groups.length === 0) return;
  if (fromGroupIndex < 0 || fromGroupIndex >= groups.length) {
    throw new Error('Invalid source group');
  }
  if (toGroupIndex < 0 || toGroupIndex >= groups.length) {
    throw new Error('Invalid target group');
  }
  if (fromGroupIndex === toGroupIndex) return;

  const reordered = [...groups];
  const [moved] = reordered.splice(fromGroupIndex, 1);
  reordered.splice(toGroupIndex, 0, moved!);

  for (let order = 0; order < reordered.length; order++) {
    for (const row of reordered[order]!) {
      db.update(stackQueue)
        .set({ deckGroupOrder: order })
        .where(
          and(eq(stackQueue.deckGroupId, row.deckGroupId), eq(stackQueue.deckSlot, row.deckSlot)),
        )
        .run();
    }
  }
}

export function lockStackGroup(playerIds: string[], allowSkillMismatch = false) {
  if (playerIds.length !== PLAYERS_PER_COURT) {
    throw new Error(`Need exactly ${PLAYERS_PER_COURT} players`);
  }

  const rows = getOrderedStackRows();
  const idSet = new Set(playerIds);
  const inStack = rows.filter((r) => r.playerId && idSet.has(r.playerId));
  if (inStack.length !== PLAYERS_PER_COURT) {
    throw new Error('All players must be in the deck');
  }

  const playerRows = db.select().from(players).where(inArray(players.id, playerIds)).all();
  const skills = playerIds.map(
    (id) => playerRows.find((p) => p.id === id)!.skill as SkillCategory,
  );
  assertSkillGroupAllowed(skills, allowSkillMismatch);

  const groupId = nanoid();
  for (const id of playerIds) {
    const row = rows.find((r) => r.playerId === id)!;
    db.update(stackQueue)
      .set({ groupId })
      .where(
        and(eq(stackQueue.deckGroupId, row.deckGroupId), eq(stackQueue.deckSlot, row.deckSlot)),
      )
      .run();
  }

  return { groupId };
}

export function unlockStackGroup(groupId: string) {
  clearStackGroup(groupId);
}

/** Move one player to a global slot index (groupIndex * 4 + slot), or insert from roster. */
export function reorderStackPlayer(playerId: string, toGlobalIndex: number) {
  const [player] = db.select().from(players).where(eq(players.id, playerId)).all();
  if (!player) throw new Error('Player not found');

  const onCourt = db
    .select()
    .from(courtPlayers)
    .all()
    .some((row) => row.playerId === playerId);
  if (onCourt) throw new Error('Player is on a court');

  if (toGlobalIndex < 0) throw new Error('Invalid position');

  const targetOrder = Math.floor(toGlobalIndex / PLAYERS_PER_COURT);
  const targetSlot = toGlobalIndex % PLAYERS_PER_COURT;
  ensureSlotRow(targetOrder, targetSlot);

  const rows = getOrderedStackRows();
  const sourceRow = rows.find((r) => r.playerId === playerId);

  if (!sourceRow) {
    const target = slotRow(getDeckGroups(), targetOrder, targetSlot)!;
    if (target.playerId) throw new Error('Slot is occupied');
    setSlotPlayer(target.deckGroupId, target.deckSlot, playerId, null);
    return;
  }

  if (sourceRow.groupId) clearStackGroup(sourceRow.groupId);

  const target = slotRow(getDeckGroups(), targetOrder, targetSlot)!;
  if (target.deckGroupId === sourceRow.deckGroupId && target.deckSlot === sourceRow.deckSlot) {
    return;
  }

  const targetPlayerId = target.playerId;
  setSlotPlayer(sourceRow.deckGroupId, sourceRow.deckSlot, targetPlayerId, null);
  setSlotPlayer(target.deckGroupId, target.deckSlot, playerId, null);
  purgeEmptyDeckGroups();
}

export function insertStackGroup(
  playerIds: string[],
  options: { allowSkillMismatch?: boolean; lockTogether?: boolean } = {},
) {
  const { allowSkillMismatch = false, lockTogether = false } = options;

  if (playerIds.length === 0) {
    throw new Error('No players to add');
  }
  if (playerIds.length > PLAYERS_PER_COURT) {
    throw new Error(`At most ${PLAYERS_PER_COURT} players per group`);
  }
  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error('Duplicate players in group');
  }

  const rows = getOrderedStackRows();
  for (const id of playerIds) {
    if (rows.some((r) => r.playerId === id)) {
      throw new Error('Player already in the deck');
    }
    const onCourt = db
      .select()
      .from(courtPlayers)
      .all()
      .some((row) => row.playerId === id);
    if (onCourt) {
      throw new Error('Player is on a court');
    }
  }

  const playerRows = db.select().from(players).where(inArray(players.id, playerIds)).all();
  if (playerRows.length !== playerIds.length) {
    throw new Error('Player not found');
  }

  const skills = playerIds.map(
    (id) => playerRows.find((p) => p.id === id)!.skill as SkillCategory,
  );
  assertSkillGroupAllowed(skills, allowSkillMismatch);

  const groups = getDeckGroups();
  const deckGroupId = nanoid();
  const deckGroupOrder = groups.length;

  for (let deckSlot = 0; deckSlot < playerIds.length; deckSlot++) {
    db.insert(stackQueue)
      .values({
        deckGroupId,
        deckGroupOrder,
        deckSlot,
        playerId: playerIds[deckSlot]!,
        groupId: null,
      })
      .run();
  }

  if (lockTogether && playerIds.length === PLAYERS_PER_COURT) {
    return lockStackGroup(playerIds, allowSkillMismatch);
  }

  return { ok: true as const };
}

/** Count players currently waiting in the deck (ignores empty slots). */
export function countStackPlayers(): number {
  return db
    .select()
    .from(stackQueue)
    .where(isNotNull(stackQueue.playerId))
    .all().length;
}
