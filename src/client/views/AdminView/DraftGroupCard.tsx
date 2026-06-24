import type { Player } from '../../../shared/types';
import { PLAYERS_PER_COURT } from '../../../shared/constants';
import { isPlayerDrag, readDraggedPlayerId } from '../../lib/drag';

export type DraftGroup = {
  id: string;
  slots: (string | null)[];
};

interface DraftGroupCardProps {
  draft: DraftGroup;
  roster: Player[];
  onChange: (id: string, slots: (string | null)[]) => void;
  onRemove: (id: string) => void;
  onAddToQueue: (draftId: string, playerIds: string[], lockTogether: boolean) => void;
}

export function DraftGroupCard({
  draft,
  roster,
  onChange,
  onRemove,
  onAddToQueue,
}: DraftGroupCardProps) {
  const filledIds = draft.slots.filter((id): id is string => Boolean(id));
  const filledCount = filledIds.length;
  const isFull = filledCount === PLAYERS_PER_COURT;

  function playerName(id: string) {
    return roster.find((p) => p.id === id)?.name ?? 'Unknown';
  }

  function setSlot(slot: number, playerId: string | null) {
    const next = [...draft.slots];
    next[slot] = playerId;
    onChange(draft.id, next);
  }

  function handleDrop(e: React.DragEvent, slot: number) {
    if (!isPlayerDrag(e)) return;
    e.preventDefault();
    const playerId = readDraggedPlayerId(e);
    if (!playerId) return;
    if (draft.slots.includes(playerId)) return;
    setSlot(slot, playerId);
  }

  return (
    <article className="w-full bg-pickle-green/5 rounded-2xl p-4 flex flex-col gap-2.5 border-2 border-dashed border-pickle-green/35">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-black">New group</h3>
        <button
          type="button"
          onClick={() => onRemove(draft.id)}
          className="text-xs text-black/45 hover:text-black font-medium"
        >
          Discard
        </button>
      </div>

      <p className="text-xs text-black/45">
        Drag friends from the roster into these slots, then add to the queue.
      </p>

      <ul className="space-y-1.5">
        {draft.slots.map((playerId, slot) => (
          <li
            key={slot}
            className="flex items-center gap-2 min-w-0 rounded-md border border-dashed border-black/15 px-2 py-1.5 transition-colors hover:border-pickle-green/40"
            onDragOver={(e) => {
              if (!isPlayerDrag(e) || playerId) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              if (playerId) return;
              handleDrop(e, slot);
            }}
          >
            <span className="w-2 h-2 rounded-full shrink-0 bg-black/12" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-black/70">
              {playerId ? (
                playerName(playerId)
              ) : (
                <span className="italic text-black/35">Drop player here</span>
              )}
            </span>
            {playerId && (
              <button
                type="button"
                onClick={() => setSlot(slot, null)}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded bg-black/8 hover:bg-black/15 text-xs font-bold text-black/70"
                aria-label="Remove from draft"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          disabled={filledCount === 0}
          onClick={() => onAddToQueue(draft.id, filledIds, false)}
          className="text-xs px-2.5 py-1.5 rounded bg-pickle-green hover:bg-pickle-green/90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-white w-full"
        >
          Add to queue ({filledCount})
        </button>
        {isFull && (
          <button
            type="button"
            onClick={() => onAddToQueue(draft.id, filledIds, true)}
            className="text-xs px-2.5 py-1.5 rounded bg-pickle-green/15 text-pickle-green border border-pickle-green/30 font-semibold hover:bg-pickle-green/25 w-full"
          >
            Add &amp; keep together
          </button>
        )}
      </div>
    </article>
  );
}

export function createDraftGroup(): DraftGroup {
  return {
    id: crypto.randomUUID(),
    slots: Array.from({ length: PLAYERS_PER_COURT }, () => null),
  };
}
