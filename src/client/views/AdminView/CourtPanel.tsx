import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { isPlayerDrag, readDraggedPlayerId } from '../../lib/drag';
import { showAlert, showConfirm } from '../../lib/dialog';
import { confirmSkillMismatchIfNeeded } from '../../lib/skillConfirm';
import { useAppStore } from '../../store/appStore';
import { MATCH_DURATION_MS, PLAYERS_PER_COURT } from '../../../shared/constants';
import type { Court } from '../../../shared/types';

const panelClass = 'bg-white rounded-lg border border-black/10 p-4 shadow-sm';
const inputClass =
  'text-xs px-2 py-1 rounded bg-white border border-black/15 text-black focus:outline-none focus:border-pickle-green';

const MAX_COURT_MINUTES = MATCH_DURATION_MS / 60_000;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const INCOMPATIBLE_GROUP_HINT = 'compatible group';

async function tryFillFromDeck(courtId: number) {
  await api.post(`/api/courts/${courtId}/fill-from-deck`);
}

async function fillFromDeckWithReshuffleOption(courtId: number) {
  try {
    await tryFillFromDeck(courtId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fill from deck';
    if (!message.toLowerCase().includes(INCOMPATIBLE_GROUP_HINT)) {
      await showAlert(message, 'Could not fill court');
      return;
    }

    const shouldReshuffle = await showConfirm(
      'Next Up does not have a compatible group of 4 (max one skill tier apart).\n\nReshuffle the deck by skill and fill this court?',
      {
        title: 'Reshuffle deck?',
        confirmLabel: 'Reshuffle & fill',
      },
    );
    if (!shouldReshuffle) return;

    try {
      await api.post('/api/stack/reshuffle');
      await tryFillFromDeck(courtId);
    } catch (retryErr) {
      await showAlert(
        retryErr instanceof Error ? retryErr.message : 'Could not fill after reshuffle',
        'Could not fill court',
      );
    }
  }
}

function CourtCard({ court }: { court: Court }) {
  const players = useAppStore((s) => s.state.players);
  const stackCount = useAppStore((s) => s.state.stack.length);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [status, setStatus] = useState<'Reserved' | 'Occupied'>('Occupied');
  const [manualAssignOpen, setManualAssignOpen] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const canDropPlayers = court.status === 'Idle' || court.status === 'Occupied';
  const canFillFromDeck = stackCount >= PLAYERS_PER_COURT;
  const isIdle = court.status === 'Idle';
  const isActive = court.status === 'Occupied' || court.status === 'Reserved';
  const isOccupied = court.status === 'Occupied';
  const timerStarted = court.timerStarted;
  const hasPlayers = court.players.every((s) => s.player != null);

  useEffect(() => {
    if (court.status !== 'Idle') {
      setManualAssignOpen(false);
      setSelectedIds([]);
    }
  }, [court.id, court.status]);

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= PLAYERS_PER_COURT) return prev;
      return [...prev, id];
    });
  }

  async function assign() {
    if (selectedIds.length !== PLAYERS_PER_COURT) {
      await showAlert(`Select exactly ${PLAYERS_PER_COURT} players`, 'Select players');
      return;
    }

    let allowSkillMismatch = false;
    if (status === 'Occupied') {
      const skills = selectedIds.map(
        (id) => players.find((p) => p.id === id)!.skill,
      );
      const mismatch = await confirmSkillMismatchIfNeeded(skills);
      if (!mismatch.proceed) return;
      allowSkillMismatch = mismatch.allowSkillMismatch;
    }

    try {
      await api.post(`/api/courts/${court.id}/assign`, {
        playerIds: selectedIds,
        status,
        allowSkillMismatch,
      });
      setManualAssignOpen(false);
      setSelectedIds([]);
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : 'Failed to assign players', 'Error');
    }
  }

  async function reserveCourt() {
    try {
      await api.post(`/api/courts/${court.id}/reserve`, {});
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : 'Failed to reserve court', 'Error');
    }
  }

  async function markReservationPaid() {
    try {
      await api.post(`/api/courts/${court.id}/mark-paid`);
    } catch (err) {
      await showAlert(
        err instanceof Error ? err.message : 'Failed to mark reservation paid',
        'Error',
      );
    }
  }

  async function endGame() {
    if (isOccupied) {
      const ok = await showConfirm(
        `End game on court ${court.id}? Players return to the deck and groups are reshuffled.`,
        { title: 'End game', confirmLabel: 'End game', destructive: true },
      );
      if (!ok) return;
    } else if (court.status === 'Reserved') {
      const ok = await showConfirm(`End reservation on court ${court.id}?`, {
        title: 'End reservation',
        confirmLabel: 'End reservation',
        destructive: true,
      });
      if (!ok) return;
    }
    await api.post(`/api/courts/${court.id}/end-game`);
  }

  async function fillFromDeck() {
    await fillFromDeckWithReshuffleOption(court.id);
  }

  async function clearCourt() {
    const ok = await showConfirm(`Clear court ${court.id}?`, {
      title: 'Clear court',
      confirmLabel: 'Clear',
      destructive: true,
    });
    if (!ok) return;
    await api.post(`/api/courts/${court.id}/clear`);
    setManualAssignOpen(false);
    setSelectedIds([]);
  }

  async function startTimer() {
    try {
      await api.post(`/api/courts/${court.id}/start-timer`);
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : 'Failed to start timer', 'Error');
    }
  }

  async function pauseTimer() {
    try {
      await api.post(`/api/courts/${court.id}/pause-timer`);
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : 'Failed to pause timer', 'Error');
    }
  }

  async function resumeTimer() {
    try {
      await api.post(`/api/courts/${court.id}/resume-timer`);
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : 'Failed to resume timer', 'Error');
    }
  }

  async function assignPlayerToSlot(slot: number, playerId: string) {
    const existingIds = court.players
      .map((s) => s.player?.id)
      .filter((id): id is string => Boolean(id));
    const allIds = [...existingIds, playerId];
    let allowSkillMismatch = false;

    if (allIds.length >= 2) {
      const skills = allIds.map((id) => players.find((p) => p.id === id)!.skill);
      const mismatch = await confirmSkillMismatchIfNeeded(skills);
      if (!mismatch.proceed) return;
      allowSkillMismatch = mismatch.allowSkillMismatch;
    }

    try {
      await api.post(`/api/courts/${court.id}/slot`, { slot, playerId, allowSkillMismatch });
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : 'Failed to assign player', 'Error');
    }
  }

  function handleSlotDragOver(e: React.DragEvent, slot: number, isEmpty: boolean) {
    if (!canDropPlayers || !isEmpty || !isPlayerDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(slot);
  }

  function handleSlotDrop(e: React.DragEvent, slot: number, isEmpty: boolean) {
    if (!canDropPlayers || !isEmpty) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(null);
    const playerId = readDraggedPlayerId(e);
    if (playerId) void assignPlayerToSlot(slot, playerId);
  }

  return (
    <div
      className={`rounded-lg border p-4 ${
        court.status === 'Occupied'
          ? 'border-pickle-green/30 bg-pickle-green/5'
          : court.status === 'Reserved'
            ? 'border-pickle-orange/35 bg-pickle-orange/5'
            : 'border-black/10 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg text-black uppercase tracking-wide">Court {court.id}</h3>
        <span
          className={`text-xs uppercase font-bold px-2 py-1 rounded border ${
            court.status === 'Occupied'
              ? 'bg-pickle-green/15 text-pickle-green border-pickle-green/30'
              : court.status === 'Reserved'
                ? 'bg-pickle-orange/15 text-pickle-orange border-pickle-orange/35'
                : 'bg-black/10 text-black/50 border-black/15'
          }`}
        >
          {court.status}
        </span>
      </div>

      {isOccupied && !timerStarted && (
        <button
          type="button"
          onClick={startTimer}
          disabled={!hasPlayers}
          title={hasPlayers ? 'Start max court time' : 'Assign 4 players first'}
          className="mb-3 w-full text-sm px-3 py-2.5 rounded bg-pickle-green hover:bg-pickle-green/90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-white"
        >
          Start timer
        </button>
      )}

      {isOccupied && timerStarted && (
        <div className="mb-3">
          <p
            className={`inline-block text-3xl font-mono font-bold tabular-nums text-white px-3 py-1 rounded ${
              court.timerPaused ? 'bg-black/40' : 'bg-pickle-orange'
            }`}
          >
            {formatTime(court.secondsRemaining)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-black/45 mt-1 font-semibold">
            {court.timerPaused ? 'Timer paused' : `Max court time · ${MAX_COURT_MINUTES} min`}
          </p>
        </div>
      )}

      {court.status === 'Reserved' && (
        <div className="mb-3">
          {court.reservationPaid ? (
            <p className="text-xs font-semibold text-pickle-green">Reservation paid ✓</p>
          ) : (
            <button
              type="button"
              onClick={markReservationPaid}
              className="w-full text-sm px-3 py-2 rounded bg-pickle-orange hover:bg-pickle-orange/90 font-semibold text-white"
            >
              Mark reservation paid
            </button>
          )}
        </div>
      )}

      {isIdle && (
        <div className="mb-3 space-y-2">
          <button
            type="button"
            onClick={fillFromDeck}
            disabled={!canFillFromDeck}
            title={
              canFillFromDeck
                ? 'Assign the next compatible group from the deck'
                : `Need at least ${PLAYERS_PER_COURT} players in the deck`
            }
            className="w-full text-sm px-3 py-2 rounded bg-pickle-orange hover:bg-pickle-orange/90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-white"
          >
            Fill from Next Up
          </button>

          <button
            type="button"
            onClick={reserveCourt}
            className="w-full text-sm px-3 py-2 rounded border-2 border-pickle-orange bg-pickle-orange/10 hover:bg-pickle-orange/15 font-semibold text-pickle-orange"
          >
            Reserve court
          </button>
        </div>
      )}

      <ul className="text-sm space-y-1 mb-3">
        {court.players.map(({ slot, player }) => {
          const isEmpty = player == null;
          const isDropTarget = canDropPlayers && isEmpty && dragOverSlot === slot;
          return (
            <li
              key={slot}
              className={`rounded-md px-2 py-1.5 border transition-colors ${
                isDropTarget
                  ? 'border-pickle-green bg-pickle-green/10 text-pickle-green'
                  : isEmpty && canDropPlayers
                    ? 'border-dashed border-black/20 text-black/45'
                    : 'border-transparent text-black'
              }`}
              onDragOver={(e) => handleSlotDragOver(e, slot, isEmpty)}
              onDragLeave={() => {
                if (dragOverSlot === slot) setDragOverSlot(null);
              }}
              onDrop={(e) => handleSlotDrop(e, slot, isEmpty)}
            >
              {slot + 1}.{' '}
              {player?.name ?? (
                <span className={canDropPlayers ? 'italic' : ''}>
                  {canDropPlayers ? 'Drop player here' : 'empty'}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {isIdle && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setManualAssignOpen((open) => !open)}
            className="text-xs font-semibold text-black/55 hover:text-black underline underline-offset-2"
          >
            {manualAssignOpen ? 'Hide manual assign' : 'Manual assign or reservation'}
          </button>

          {manualAssignOpen && (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {players.map((p) => {
                  const selected = selectedIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlayer(p.id)}
                      className={`text-xs px-2 py-1 rounded border transition-colors font-medium ${
                        selected
                          ? 'bg-pickle-green border-pickle-green text-white'
                          : 'bg-white border-black/15 text-black/60 hover:border-pickle-green/50'
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Reserved' | 'Occupied')}
                  className={inputClass}
                >
                  <option value="Occupied">Occupied (open play)</option>
                  <option value="Reserved">Reserved (court rental)</option>
                </select>

                <button
                  type="button"
                  onClick={assign}
                  className="text-xs px-3 py-1 rounded bg-pickle-green hover:bg-pickle-green/90 font-semibold text-white"
                >
                  Assign 4
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isActive && (
          <button
            type="button"
            onClick={endGame}
            className="text-xs px-3 py-1 rounded bg-pickle-orange hover:bg-pickle-orange/90 font-semibold text-white"
          >
            {court.status === 'Reserved' ? 'End reservation' : 'End game'}
          </button>
        )}

        {isOccupied && timerStarted && (
          court.timerPaused ? (
            <button
              type="button"
              onClick={resumeTimer}
              className="text-xs px-3 py-1 rounded bg-pickle-green hover:bg-pickle-green/90 font-semibold text-white"
            >
              Resume timer
            </button>
          ) : (
            <button
              type="button"
              onClick={pauseTimer}
              className="text-xs px-3 py-1 rounded bg-black/10 hover:bg-black/15 font-medium text-black"
            >
              Pause timer
            </button>
          )
        )}

        {isOccupied && timerStarted && (
          <button
            type="button"
            onClick={startTimer}
            className="text-xs px-3 py-1 rounded bg-pickle-green hover:bg-pickle-green/90 font-semibold text-white"
          >
            Restart timer
          </button>
        )}

        {(isActive || isIdle) && (
          <button
            type="button"
            onClick={clearCourt}
            className="text-xs px-3 py-1 rounded bg-black/10 hover:bg-black/15 font-medium text-black"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export function CourtPanel() {
  const courts = useAppStore((s) => s.state.courts);

  return (
    <section className={panelClass}>
      <h2 className="text-lg font-semibold mb-1 text-black">Courts</h2>
      <p className="text-xs text-black/45 mb-3">
        Drag players from the roster or deck onto empty court slots. Start the timer when all four
        spots are filled.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {courts.map((court) => (
          <CourtCard key={court.id} court={court} />
        ))}
      </div>
    </section>
  );
}
