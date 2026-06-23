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
  /** Admin: move this group up/down in the queue */
  onMoveGroup?: (index: number, direction: 'up' | 'down') => void;
  /** Admin: drag player to a new stack position */
  onReorderPlayer?: (playerId: string, toIndex: number) => void;
  draggingPlayerId?: string | null;
  onDragPlayerStart?: (playerId: string) => void;
  onDragPlayerEnd?: () => void;
  dragOverIndex?: number | null;
  onDragOverIndex?: (index: number | null) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  /** Admin: lock/unlock foursome */
  isLocked?: boolean;
  stackGroupId?: string | null;
  onKeepTogether?: (playerIds: string[]) => void;
  onUngroup?: (groupId: string) => void;
  /** display = fixed-width carousel card; admin = full-width stacked card */
  layout?: 'display' | 'admin';
}

export function DeckGroupCard({
  players,
  index,
  baseStackIndex = index * PLAYERS_PER_COURT,
  onRemovePlayer,
  onMoveGroup,
  onReorderPlayer,
  draggingPlayerId = null,
  onDragPlayerStart,
  onDragPlayerEnd,
  dragOverIndex = null,
  onDragOverIndex,
  canMoveUp = false,
  canMoveDown = false,
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
  const canDrag = isAdmin && Boolean(onReorderPlayer);

  function handleDragStart(e: React.DragEvent, playerId: string) {
    e.dataTransfer.setData('text/plain', playerId);
    e.dataTransfer.setData('application/x-picklegrounds-player', playerId);
    e.dataTransfer.effectAllowed = 'move';
    onDragPlayerStart?.(playerId);
  }

  function handleDragOver(e: React.DragEvent, stackIndex: number) {
    if (!canDrag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOverIndex?.(stackIndex);
  }

  function handleDrop(e: React.DragEvent, toIndex: number) {
    if (!canDrag || !onReorderPlayer) return;
    e.preventDefault();
    e.stopPropagation();
    const playerId =
      e.dataTransfer.getData('application/x-picklegrounds-player') ||
      e.dataTransfer.getData('text/plain') ||
      draggingPlayerId ||
      '';
    onDragOverIndex?.(null);
    if (playerId) onReorderPlayer(playerId, toIndex);
  }

  function handleDragEnd() {
    onDragOverIndex?.(null);
    onDragPlayerEnd?.();
  }

  return (
    <article
      className={
        isAdmin
          ? `min-w-0 w-full bg-white rounded-2xl p-4 flex flex-col gap-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06] ${
              isNext
                ? 'ring-2 ring-pickle-orange ring-offset-2 ring-offset-white'
                : ''
            } ${isLocked ? 'ring-1 ring-pickle-green/40' : ''}`
          : `shrink-0 w-60 xl:w-64 2xl:w-72 bg-white rounded-2xl p-5 flex flex-col gap-3 shadow-[0_6px_20px_rgba(0,0,0,0.07)] ring-1 ring-black/[0.05] ${
              isNext ? 'ring-2 ring-pickle-orange ring-offset-2 ring-offset-[#E1DBD8]' : ''
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

        {isAdmin && onMoveGroup && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onMoveGroup(index, 'up')}
              disabled={!canMoveUp}
              className="w-7 h-7 rounded bg-black/8 hover:bg-black/15 disabled:opacity-30 text-xs font-bold"
              title="Move group up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => onMoveGroup(index, 'down')}
              disabled={!canMoveDown}
              className="w-7 h-7 rounded bg-black/8 hover:bg-black/15 disabled:opacity-30 text-xs font-bold"
              title="Move group down"
            >
              ↓
            </button>
          </div>
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

      <ul className={isAdmin ? 'space-y-1.5' : 'space-y-2.5'}>
        {Array.from({ length: 4 }, (_, i) => {
          const player = players[i];
          const stackIndex = baseStackIndex + i;
          const isDropTarget = canDrag && player && dragOverIndex === stackIndex;
          return (
            <li
              key={player?.id ?? `empty-${i}`}
              className={`flex items-center gap-2 min-w-0 rounded-md transition-colors ${
                isDropTarget ? 'bg-pickle-green/15 ring-1 ring-pickle-green/40' : ''
              } ${canDrag && player ? 'cursor-grab active:cursor-grabbing' : ''}`}
              draggable={canDrag && Boolean(player)}
              onDragStart={player ? (e) => handleDragStart(e, player.id) : undefined}
              onDragOver={player ? (e) => handleDragOver(e, stackIndex) : undefined}
              onDragLeave={
                canDrag && player
                  ? () => {
                      if (dragOverIndex === stackIndex) onDragOverIndex?.(null);
                    }
                  : undefined
              }
              onDrop={player ? (e) => handleDrop(e, stackIndex) : undefined}
              onDragEnd={canDrag ? handleDragEnd : undefined}
            >
              {canDrag && player && (
                <span
                  className="shrink-0 text-black/25 text-xs select-none"
                  aria-hidden
                  title="Drag to reorder"
                >
                  ⋮⋮
                </span>
              )}
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  player ? 'bg-pickle-green' : 'bg-black/12'
                }`}
              />
              <span
                className={`min-w-0 flex-1 truncate font-semibold ${
                  isAdmin ? 'text-sm' : 'text-base xl:text-lg font-bold'
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
