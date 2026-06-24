import { useState } from 'react';
import { api } from '../../lib/api';
import { showAlert } from '../../lib/dialog';
interface StartSessionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function StartSessionDialog({ open, onClose }: StartSessionDialogProps) {
  const [removePlayers, setRemovePlayers] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleStart() {
    setLoading(true);
    try {
      await api.post('/api/session/start-new', { removePlayers });
      setRemovePlayers(false);
      onClose();
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : 'Failed to start new session', 'Error');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setRemovePlayers(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-session-title"
    >
      <div className="w-full max-w-md rounded-lg border border-black/10 bg-white p-5 shadow-lg">
        <h2 id="start-session-title" className="text-lg font-semibold text-black">
          Start new session?
        </h2>
        <p className="mt-2 text-sm text-black/60 leading-relaxed">
          This clears all courts, empties the deck, and resets paid status for today&apos;s players.
          Finances are not affected.
        </p>

        <label className="mt-4 flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={removePlayers}
            onChange={(e) => setRemovePlayers(e.target.checked)}
            disabled={loading}
            className="mt-0.5 rounded border-black/20 text-pickle-green focus:ring-pickle-green/40"
          />
          <span className="text-sm text-black/70">
            Also remove all registered players from the roster
          </span>
        </label>

        <div className="mt-5 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="text-sm px-4 py-2 rounded bg-black/10 hover:bg-black/15 font-medium text-black disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={loading}
            className="text-sm px-4 py-2 rounded bg-pickle-orange hover:bg-pickle-orange/90 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Starting…' : 'Start session'}
          </button>
        </div>
      </div>
    </div>
  );
}
