import { useMemo, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import { PLAYERS_PER_COURT } from '../../../shared/constants';
import { hasMixedSkillTiers, isValidSkillGroup } from '../../../shared/skill';
import { chunkIntoGroups } from '../DisplayView/displayUtils';
import { DeckGroupCard } from '../DisplayView/DeckGroupCard';

const panelClass = 'bg-white rounded-lg border border-black/10 p-4 shadow-sm';

export function StackPanel() {
  const stack = useAppStore((s) => s.state.stack);
  const groups = useMemo(() => chunkIntoGroups(stack), [stack]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [draggingGroupIndex, setDraggingGroupIndex] = useState<number | null>(null);
  const [dragOverGroupIndex, setDragOverGroupIndex] = useState<number | null>(null);
  const [keepTogetherDialog, setKeepTogetherDialog] = useState<
    | { kind: 'confirm'; playerIds: string[]; tiers: string }
    | { kind: 'notice'; message: string }
    | null
  >(null);

  async function removeFromStack(playerId: string) {
    try {
      await api.delete(`/api/players/${playerId}/stack`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove from queue');
    }
  }

  async function reorderGroup(fromGroupIndex: number, toGroupIndex: number) {
    if (fromGroupIndex === toGroupIndex) return;
    try {
      await api.post('/api/stack/move-group-to', { fromGroupIndex, toGroupIndex });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to move group');
    } finally {
      setDraggingGroupIndex(null);
      setDragOverGroupIndex(null);
    }
  }

  async function submitKeepTogether(playerIds: string[]) {
    try {
      await api.post('/api/stack/keep-together', { playerIds });
      setKeepTogetherDialog(null);
    } catch (err) {
      setKeepTogetherDialog({
        kind: 'notice',
        message: err instanceof Error ? err.message : 'Failed to keep group together',
      });
    }
  }

  function keepTogether(playerIds: string[]) {
    const members = playerIds
      .map((id) => stack.find((p) => p.id === id))
      .filter((p): p is (typeof stack)[number] => Boolean(p));
    const skills = members.map((p) => p.skill);

    if (!isValidSkillGroup(skills)) {
      setKeepTogetherDialog({
        kind: 'notice',
        message:
          'This group spans more than one skill tier apart and cannot be locked together.',
      });
      return;
    }

    if (hasMixedSkillTiers(skills)) {
      const tiers = [...new Set(skills)].join(', ');
      setKeepTogetherDialog({ kind: 'confirm', playerIds, tiers });
      return;
    }

    void submitKeepTogether(playerIds);
  }

  async function ungroup(groupId: string) {
    try {
      await api.post('/api/stack/ungroup', { groupId });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to ungroup');
    }
  }

  async function reorderPlayer(playerId: string, toIndex: number) {
    if (!playerId) return;
    const fromIndex = stack.findIndex((p) => p.id === playerId);
    if (fromIndex === toIndex) return;
    try {
      await api.post('/api/stack/reorder', { playerId, toIndex });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reorder player');
    } finally {
      setDraggingPlayerId(null);
    }
  }

  function groupMeta(groupPlayers: typeof stack) {
    const filled = groupPlayers.filter(Boolean);
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

  return (
    <section
      className={`${panelClass} flex flex-col overflow-hidden h-full min-h-[min(420px,calc(100vh-14rem))]`}
    >
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold text-black">Stack Queue</h2>
        {stack.length > 0 && (
          <p className="text-xs text-black/45 tabular-nums">
            {stack.length} waiting · {groups.length} group{groups.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <p className="text-xs text-black/45 mb-3 shrink-0">
        Drag the ⋮⋮ handle on a group card to reorder whole groups. Drag player names to move
        individuals. Lock a full group of 4 to keep friends together through reshuffles.
      </p>

      {stack.length === 0 ? (
        <p className="text-black/45 text-sm flex-1">Queue is empty. Add players from the roster.</p>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 px-1 pb-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {groups.map((group, index) => {
              const { isLocked, stackGroupId } = groupMeta(group);
              return (
                <DeckGroupCard
                  key={group.map((p) => p.id).join('-') || index}
                  players={group}
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
                  onReorderPlayer={reorderPlayer}
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
          </div>
        </div>
      )}
      <ConfirmDialog
        open={keepTogetherDialog?.kind === 'confirm'}
        title="Skill levels are apart"
        message={`This group mixes ${keepTogetherDialog?.kind === 'confirm' ? keepTogetherDialog.tiers : ''}. Continue to group these players together?`}
        confirmLabel="Group together"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (keepTogetherDialog?.kind === 'confirm') {
            void submitKeepTogether(keepTogetherDialog.playerIds);
          }
        }}
        onCancel={() => setKeepTogetherDialog(null)}
      />
      <ConfirmDialog
        open={keepTogetherDialog?.kind === 'notice'}
        title="Cannot group"
        message={keepTogetherDialog?.kind === 'notice' ? keepTogetherDialog.message : ''}
        confirmLabel="OK"
        onConfirm={() => setKeepTogetherDialog(null)}
        onCancel={() => setKeepTogetherDialog(null)}
      />
    </section>
  );
}
