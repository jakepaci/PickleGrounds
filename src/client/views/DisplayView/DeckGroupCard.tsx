import type { Player } from '../../../shared/types';
import { PLAYERS_PER_COURT } from '../../../shared/constants';
import { deckGroupLabel } from './displayUtils';

interface DeckGroupCardProps {
  players: Player[];
  index: number;
  /** Global stack index of the first slot in this group card */
  baseStackIndex?: number;
  /** Admin: remove a player from the queue */
  onRemovePlayer?: (playerId: string) => void;
  /** Admin: drag a whole group to a new queue position */
  onReorderGroup?: (fromGroupIndex: number, toGroupIndex: number) => void;
  draggingGroupIndex?: number | null;
  onDragGroupStart?: (groupIndex: number) => void;
  onDragGroupEnd?: () => void;
  dragOverGroupIndex?: number | null;
  onDragOverGroupIndex?: (groupIndex: number | null) => void;
  /** Admin: drag player to a new stack position */
  onReorderPlayer?: (playerId: string, toIndex: number) => void;
  draggingPlayerId?: string | null;
  onDragPlayerStart?: (playerId: string) => void;
  onDragPlayerEnd?: () => void;
  dragOverIndex?: number | null;
  onDragOverIndex?: (index: number | null) => void;
  /** Admin: lock/unlock foursome */
  isLocked?: boolean;
  stackGroupId?: string | null;
  onKeepTogether?: (playerIds: string[]) => void;
  onUngroup?: (groupId: string) => void;
  /** display = fixed-width carousel card; admin = full-width stacked card */
  layout?: 'display' | 'admin';
}

const PLAYER_MIME = 'application/x-picklegrounds-player';
const GROUP_MIME = 'application/x-picklegrounds-group';

export function DeckGroupCard({
  players,
  index,
  baseStackIndex = index * PLAYERS_PER_COURT,
  onRemovePlayer,
  onReorderGroup,
  draggingGroupIndex = null,
  onDragGroupStart,
  onDragGroupEnd,
  dragOverGroupIndex = null,
  onDragOverGroupIndex,
  onReorderPlayer,
  draggingPlayerId = null,
  onDragPlayerStart,
  onDragPlayerEnd,
  dragOverIndex = null,
  onDragOverIndex,
  isLocked = false,
  stackGroupId,
  onKeepTogether,
  onUngroup,
  layout = 'display',
}: DeckGroupCardProps) {
  const label = deckGroupLabel(index);
  const isNext = index === 0;
  const isAdmin = layout === 'admin';
  const filledPlayers = players.filter(Boolean);
  const canKeepTogether =
    isAdmin && filledPlayers.length === 4 && !isLocked && onKeepTogether;
  const canDragGroup = isAdmin && Boolean(onReorderGroup);
  const canDragPlayer = isAdmin && Boolean(onReorderPlayer);
  const isDraggingGroup = draggingGroupIndex === index;
  const isGroupDropTarget = dragOverGroupIndex === index && draggingGroupIndex !== index;

  function handlePlayerDragStart(e: React.DragEvent, playerId: string) {
    e.dataTransfer.setData('text/plain', playerId);
    e.dataTransfer.setData(PLAYER_MIME, playerId);
    e.dataTransfer.effectAllowed = 'move';
    onDragPlayerStart?.(playerId);
  }

  function handlePlayerDragOver(e: React.DragEvent, stackIndex: number) {
    if (!canDragPlayer) return;
    if (e.dataTransfer.types.includes(GROUP_MIME)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    onDragOverIndex?.(stackIndex);
  }

  function handlePlayerDrop(e: React.DragEvent, toIndex: number) {
    if (!canDragPlayer || !onReorderPlayer) return;
    if (e.dataTransfer.types.includes(GROUP_MIME)) return;
    e.preventDefault();
    e.stopPropagation();
    const playerId =
      e.dataTransfer.getData(PLAYER_MIME) ||
      e.dataTransfer.getData('text/plain') ||
      draggingPlayerId ||
      '';
    onDragOverIndex?.(null);
    if (playerId) onReorderPlayer(playerId, toIndex);
  }

  function handlePlayerDragEnd() {
    onDragOverIndex?.(null);
    onDragPlayerEnd?.();
  }

  function handleGroupDragStart(e: React.DragEvent) {
    e.dataTransfer.setData(GROUP_MIME, String(index));
    e.dataTransfer.effectAllowed = 'move';
    onDragGroupStart?.(index);
  }

  function handleGroupDragOver(e: React.DragEvent) {
    if (!canDragGroup || draggingGroupIndex === index) return;
    if (!e.dataTransfer.types.includes(GROUP_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOverGroupIndex?.(index);
  }

  function handleGroupDrop(e: React.DragEvent) {
    if (!canDragGroup || !onReorderGroup) return;
    const from = e.dataTransfer.getData(GROUP_MIME);
    if (!from) return;
    e.preventDefault();
    e.stopPropagation();
    onDragOverGroupIndex?.(null);
    onReorderGroup(Number(from), index);
  }

  function handleGroupDragEnd() {
    onDragOverGroupIndex?.(null);
    onDragGroupEnd?.();
  }

  function borderClass() {
    if (isGroupDropTarget) return 'border-2 border-pickle-green';
    if (isLocked) return 'border-pickle-green/40';
    if (isNext) return 'border-2 border-pickle-orange';
    return isAdmin ? 'border-black/10' : 'border-black/[0.08]';
  }

  return (
    <article
      onDragOver={handleGroupDragOver}
      onDragLeave={
        canDragGroup
          ? (e) => {
              if (
                dragOverGroupIndex === index &&
                !e.currentTarget.contains(e.relatedTarget as Node)
              ) {
                onDragOverGroupIndex?.(null);
              }
            }
          : undefined
      }
      onDrop={handleGroupDrop}
      className={
        isAdmin
          ? `w-full bg-white rounded-2xl p-4 flex flex-col gap-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.06)] border ${
              isDraggingGroup ? 'opacity-55 shadow-lg' : ''
            } ${borderClass()}`
          : `shrink-0 w-64 xl:w-72 2xl:w-80 bg-white rounded-2xl p-5 flex flex-col gap-3 shadow-[0_6px_20px_rgba(0,0,0,0.07)] border ${
              isNext ? 'border-2 border-pickle-orange' : 'border-black/[0.08]'
            }`
      }
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-extrabold text-white shrink-0 ${
              isNext ? 'bg-pickle-orange' : 'bg-black/25'
            }`}
          >
            {index + 1}
          </span>
          <h3
            className={`font-extrabold text-black tracking-tight truncate ${
              isAdmin ? 'text-sm' : 'text-base xl:text-lg'
            }`}
          >
            {label}
          </h3>
          {isLocked && isAdmin && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-pickle-green shrink-0">
              Together
            </span>
          )}
        </div>

        {canDragGroup && (
          <span
            draggable
            onDragStart={handleGroupDragStart}
            onDragEnd={handleGroupDragEnd}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md bg-black/6 hover:bg-black/10 text-black/35 text-xs select-none cursor-grab active:cursor-grabbing"
            title="Drag group to reorder"
            aria-label={`Drag ${label} to reorder`}
          >
            ⋮⋮
          </span>
        )}
      </div>

      {canKeepTogether && (
        <button
          type="button"
          onClick={() => onKeepTogether(filledPlayers.map((p) => p.id))}
          className="text-xs px-2.5 py-1 rounded bg-pickle-green/15 text-pickle-green border border-pickle-green/30 font-semibold hover:bg-pickle-green/25 w-full"
        >
          Keep together (friends)
        </button>
      )}

      {isLocked && isAdmin && stackGroupId && onUngroup && (
        <button
          type="button"
          onClick={() => onUngroup(stackGroupId)}
          className="text-xs px-2.5 py-1 rounded bg-black/5 text-black/60 border border-black/10 font-medium hover:bg-black/10 w-full"
        >
          Ungroup
        </button>
      )}

      <ul className={isAdmin ? 'space-y-1.5' : 'space-y-3'}>
        {Array.from({ length: 4 }, (_, i) => {
          const player = players[i];
          const stackIndex = baseStackIndex + i;
          const isDropTarget = canDragPlayer && player && dragOverIndex === stackIndex;
          return (
            <li
              key={player?.id ?? `empty-${i}`}
              className={`flex items-center gap-2 min-w-0 rounded-md transition-colors ${
                isDropTarget ? 'bg-pickle-green/15 ring-1 ring-pickle-green/40' : ''
              } ${canDragPlayer && player ? 'cursor-grab active:cursor-grabbing' : ''}`}
              draggable={canDragPlayer && Boolean(player)}
              onDragStart={player ? (e) => handlePlayerDragStart(e, player.id) : undefined}
              onDragOver={player ? (e) => handlePlayerDragOver(e, stackIndex) : undefined}
              onDragLeave={
                canDragPlayer && player
                  ? () => {
                      if (dragOverIndex === stackIndex) onDragOverIndex?.(null);
                    }
                  : undefined
              }
              onDrop={player ? (e) => handlePlayerDrop(e, stackIndex) : undefined}
              onDragEnd={canDragPlayer ? handlePlayerDragEnd : undefined}
            >
              {canDragPlayer && player && (
                <span
                  className="shrink-0 text-black/25 text-xs select-none"
                  aria-hidden
                  title="Drag to reorder"
                >
                  ⋮⋮
                </span>
              )}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  player ? 'bg-pickle-green' : 'bg-black/12'
                }`}
              />
              <span
                className={`min-w-0 flex-1 truncate font-semibold ${
                  isAdmin ? 'text-sm' : 'text-lg xl:text-xl 2xl:text-2xl font-bold'
                } ${player ? 'text-black' : 'text-black/25'}`}
              >
                {player?.name ?? 'Open slot'}
              </span>
              {player && onRemovePlayer && (
                <button
                  type="button"
                  onClick={() => onRemovePlayer(player.id)}
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded bg-black/8 hover:bg-black/15 text-xs font-bold text-black/70 leading-none"
                  aria-label={`Remove ${player.name}`}
                  title="Remove from queue"
                >
                  ✕
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
