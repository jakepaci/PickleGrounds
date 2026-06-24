import { useMemo, useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { isPlayerDrag, readDraggedPlayerId } from '../../lib/drag';
import { showAlert } from '../../lib/dialog';
import {
  confirmAdjacentSkillMixIfNeeded,
  confirmSkillMismatchIfNeeded,
} from '../../lib/skillConfirm';
import { useAppStore } from '../../store/appStore';
import { useUiStore } from '../../store/uiStore';
import { PLAYERS_PER_COURT } from '../../../shared/constants';
import type { Player } from '../../../shared/types';
import { DeckGroupCard } from '../DisplayView/DeckGroupCard';
import { createDraftGroup, DraftGroupCard, type DraftGroup } from './DraftGroupCard';

const panelClass =
  'bg-white rounded-lg border border-black/10 p-4 shadow-sm flex flex-col overflow-hidden max-h-[min(560px,calc(100vh-11rem))] xl:max-h-[min(640px,calc(100vh-10rem))] h-full min-h-[280px]';

export function StackPanel() {
  const stack = useAppStore((s) => s.state.stack);
  const stackGroups = useAppStore((s) => s.state.stackGroups);
  const roster = useAppStore((s) => s.state.players);
  const [draftGroups, setDraftGroups] = useState<DraftGroup[]>([]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [draggingGroupIndex, setDraggingGroupIndex] = useState<number | null>(null);
  const [dragOverGroupIndex, setDragOverGroupIndex] = useState<number | null>(null);
  const [emptyQueueDragOver, setEmptyQueueDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const setDraftPlayerIds = useUiStore((s) => s.setDraftPlayerIds);

  useEffect(() => {
    const ids = draftGroups.flatMap((d) => d.slots.filter((id): id is string => Boolean(id)));
    setDraftPlayerIds(ids);
    return () => setDraftPlayerIds([]);
  }, [draftGroups, setDraftPlayerIds]);

  function addDraftGroup() {
    setDraftGroups((prev) => [...prev, createDraftGroup()]);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }

  const visibleGroups = useMemo(
    () => stackGroups.filter((g) => g.slots.some((p) => p != null)),
    [stackGroups],
  );

  async function insertOrReorderPlayer(playerId: string, toIndex: number) {
    if (!playerId) return;
    const fromIndex = stack.findIndex((p) => p.id === playerId);
    if (fromIndex !== -1 && fromIndex === toIndex) return;
    try {
      await api.post('/api/stack/reorder', { playerId, toIndex });
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : 'Failed to add player to queue', 'Error');
    } finally {
      setDraggingPlayerId(null);
      setEmptyQueueDragOver(false);
    }
  }

  async function removeFromStack(playerId: string) {
    try {
      await api.delete(`/api/players/${playerId}/stack`);
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : 'Failed to remove from queue', 'Error');
    }
  }

  async function reorderGroup(fromGroupIndex: number, toGroupIndex: number) {
    if (fromGroupIndex === toGroupIndex) return;
    try {
      await api.post('/api/stack/move-group-to', { fromGroupIndex, toGroupIndex });
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : 'Failed to move group', 'Error');
    } finally {
      setDraggingGroupIndex(null);
      setDragOverGroupIndex(null);
    }
  }

  async function submitKeepTogether(playerIds: string[], allowSkillMismatch = false) {
    try {
      await api.post('/api/stack/keep-together', { playerIds, allowSkillMismatch });
    } catch (err) {
      await showAlert(
        err instanceof Error ? err.message : 'Failed to keep group together',
        'Error',
      );
    }
  }

  async function keepTogether(playerIds: string[]) {
    const members = playerIds
      .map((id) => stack.find((p) => p.id === id))
      .filter((p): p is Player => Boolean(p));
    const skills = members.map((p) => p.skill);

    const mismatch = await confirmSkillMismatchIfNeeded(skills);
    if (!mismatch.proceed) return;
    if (mismatch.allowSkillMismatch) {
      await submitKeepTogether(playerIds, true);
      return;
    }

    const ok = await confirmAdjacentSkillMixIfNeeded(skills);
    if (!ok) return;
    await submitKeepTogether(playerIds);
  }

  function updateDraftGroup(id: string, slots: (string | null)[]) {
    setDraftGroups((prev) => prev.map((d) => (d.id === id ? { ...d, slots } : d)));
  }

  function removeDraftGroup(id: string) {
    setDraftGroups((prev) => prev.filter((d) => d.id !== id));
  }

  async function addDraftToQueue(draftId: string, playerIds: string[], lockTogether: boolean) {
    const members = playerIds
      .map((id) => roster.find((p) => p.id === id))
      .filter((p): p is (typeof roster)[number] => Boolean(p));
    const skills = members.map((p) => p.skill);

    const mismatch = await confirmSkillMismatchIfNeeded(skills);
    if (!mismatch.proceed) return;

    if (!mismatch.allowSkillMismatch) {
      const ok = await confirmAdjacentSkillMixIfNeeded(skills);
      if (!ok) return;
    }

    try {
      await api.post('/api/stack/insert-group', {
        playerIds,
        lockTogether,
        allowSkillMismatch: mismatch.allowSkillMismatch,
      });
      setDraftGroups((prev) => prev.filter((d) => d.id !== draftId));
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : 'Failed to add group', 'Error');
    }
  }

  async function ungroup(groupId: string) {
    try {
      await api.post('/api/stack/ungroup', { groupId });
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : 'Failed to ungroup', 'Error');
    }
  }

  function groupMeta(slots: (Player | null)[]) {
    const filled = slots.filter((p): p is Player => p != null);
    const groupIds = filled.map((p) => p.stackGroupId).filter(Boolean);
    const isLocked =
      filled.length === PLAYERS_PER_COURT &&
      groupIds.length === PLAYERS_PER_COURT &&
      groupIds.every((id) => id === groupIds[0]);
    return {
      isLocked,
      stackGroupId: isLocked ? groupIds[0]! : null,
    };
  }

  const hasQueueContent = visibleGroups.length > 0 || draftGroups.length > 0;

  return (
    <section className={panelClass}>
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold text-black">Stack Queue</h2>
        <div className="flex flex-wrap items-center gap-2">
          {stack.length > 0 && (
            <p className="text-xs text-black/45 tabular-nums">
              {stack.length} waiting · {visibleGroups.length} group
              {visibleGroups.length !== 1 ? 's' : ''}
            </p>
          )}
          <button
            type="button"
            onClick={addDraftGroup}
            className="text-xs px-2.5 py-1 rounded bg-pickle-green hover:bg-pickle-green/90 font-semibold text-white"
          >
            + Add group
          </button>
        </div>
      </div>

      <p className="text-xs text-black/45 mb-3 shrink-0">
        Drag players from the roster onto open deck slots. Drag ⋮⋮ on a group card to reorder
        whole groups, or drag names to move individuals.
      </p>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 px-1 pb-1">
        {!hasQueueContent ? (
          <div
            className={`flex min-h-[12rem] items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
              emptyQueueDragOver
                ? 'border-pickle-green bg-pickle-green/10 text-pickle-green'
                : 'border-black/15 text-black/45'
            }`}
            onDragOver={(e) => {
              if (!isPlayerDrag(e)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setEmptyQueueDragOver(true);
            }}
            onDragLeave={() => setEmptyQueueDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              const playerId = readDraggedPlayerId(e, draggingPlayerId);
              if (playerId) void insertOrReorderPlayer(playerId, 0);
            }}
          >
            <p className="text-sm text-center">
              {emptyQueueDragOver ? 'Release to add to deck' : 'Drop a player here to start the queue'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {visibleGroups.map((group, index) => {
              const { isLocked, stackGroupId } = groupMeta(group.slots);
              return (
                <DeckGroupCard
                  key={group.id}
                  players={group.slots}
                  index={index}
                  baseStackIndex={index * PLAYERS_PER_COURT}
                  layout="admin"
                  onRemovePlayer={removeFromStack}
                  onReorderGroup={reorderGroup}
                  draggingGroupIndex={draggingGroupIndex}
                  onDragGroupStart={setDraggingGroupIndex}
                  onDragGroupEnd={() => setDraggingGroupIndex(null)}
                  dragOverGroupIndex={dragOverGroupIndex}
                  onDragOverGroupIndex={setDragOverGroupIndex}
                  onReorderPlayer={insertOrReorderPlayer}
                  draggingPlayerId={draggingPlayerId}
                  onDragPlayerStart={setDraggingPlayerId}
                  onDragPlayerEnd={() => setDraggingPlayerId(null)}
                  dragOverIndex={dragOverIndex}
                  onDragOverIndex={setDragOverIndex}
                  isLocked={isLocked}
                  stackGroupId={stackGroupId}
                  onKeepTogether={keepTogether}
                  onUngroup={ungroup}
                />
              );
            })}
            {draftGroups.map((draft) => (
              <DraftGroupCard
                key={draft.id}
                draft={draft}
                roster={roster}
                onChange={updateDraftGroup}
                onRemove={removeDraftGroup}
                onAddToQueue={addDraftToQueue}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
