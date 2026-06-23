interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Continue',
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-white rounded-xl border border-black/10 shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className="text-base font-bold text-black mb-2">
          {title}
        </h3>
        <p className="text-sm text-black/65 leading-relaxed mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          {cancelLabel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 rounded-lg text-sm font-semibold text-black/70 bg-black/5 hover:bg-black/10 border border-black/10"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-pickle-green hover:bg-pickle-green/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
