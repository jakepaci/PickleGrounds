import { useDialogStore } from '../store/dialogStore';

export function DialogHost() {
  const current = useDialogStore((s) => s.current);
  const resolve = useDialogStore((s) => s.resolve);

  if (!current || !resolve) return null;

  const isAlert = current.type === 'alert';

  function closeAlert() {
    resolve(true);
  }

  function cancel() {
    resolve(false);
  }

  function confirm() {
    resolve(true);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-dialog-title"
      onClick={isAlert ? closeAlert : cancel}
    >
      <div
        className="w-full max-w-sm bg-white rounded-xl border border-black/10 shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="app-dialog-title" className="text-base font-bold text-black mb-2">
          {current.title}
        </h3>
        <p className="text-sm text-black/65 leading-relaxed whitespace-pre-line mb-5">
          {current.message}
        </p>
        <div className="flex justify-end gap-2">
          {!isAlert && (
            <button
              type="button"
              onClick={cancel}
              className="px-3.5 py-2 rounded-lg text-sm font-semibold text-black/70 bg-black/5 hover:bg-black/10 border border-black/10"
            >
              {current.type === 'confirm' ? (current.cancelLabel ?? 'Cancel') : 'Cancel'}
            </button>
          )}
          <button
            type="button"
            onClick={isAlert ? closeAlert : confirm}
            className={`px-3.5 py-2 rounded-lg text-sm font-semibold text-white ${
              !isAlert && current.type === 'confirm' && current.destructive
                ? 'bg-pickle-orange hover:bg-pickle-orange/90'
                : 'bg-pickle-green hover:bg-pickle-green/90'
            }`}
          >
            {isAlert
              ? 'OK'
              : current.type === 'confirm'
                ? (current.confirmLabel ?? 'Continue')
                : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
