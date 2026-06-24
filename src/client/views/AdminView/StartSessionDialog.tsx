import { useState } from 'react';
import { api } from '../../lib/api';
import { showAlert, showConfirm } from '../../lib/dialog';

interface StartSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onSessionStarted?: () => void;
}

export function StartSessionDialog({ open, onClose, onSessionStarted }: StartSessionDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleStart() {
    const ok = await showConfirm(
      'This clears all courts, empties the deck, and removes every player from the roster.\n\nFinances totals are not reset.',
      {
        title: 'Start new session?',
        confirmLabel: 'Start session',
        destructive: true,
      },
    );
    if (!ok) return;

    setLoading(true);
    try {
      await api.post('/api/session/start-new');
      onSessionStarted?.();
      onClose();
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : 'Failed to start new session', 'Error');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
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
          Start new session
        </h2>
        <p className="mt-2 text-sm text-black/60 leading-relaxed">
          Use this at the start or end of a facility day. All courts go idle, the stack queue
          empties, and the player roster is cleared. Paid flags reset with the roster. Finance
          totals are kept.
        </p>

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
