import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// The "are you sure" step before a delete, centered over a blurred, scroll-locked page.
export default function DeleteConfirm({
  onCancel,
  onConfirm,
  error,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  error: string | null;
}) {
  // Lock the page behind the modal so the background cannot scroll while it is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return createPortal(
    <div
      data-chat-overlay
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <p id="delete-title" className="text-lg font-bold text-slate-900">
              Delete this conversation?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              This removes the messages from your side for good. They will not come back if you
              message again. The other person keeps their copy.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
          >
            Delete
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </div>
    </div>,
    document.body
  );
}
