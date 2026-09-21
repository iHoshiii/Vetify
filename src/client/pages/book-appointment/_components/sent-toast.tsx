import { useEffect } from 'react';

// Floats above the booking modal so the "it's on its way" lands the moment confirm succeeds.
export default function SentToast({
  vetName,
  onDismiss,
}: {
  vetName: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed inset-x-0 top-5 z-[60] flex justify-center px-4">
      <div
        role="status"
        className="animate-slideDown flex w-full max-w-md items-start gap-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-2xl"
      >
        <span aria-hidden className="mt-0.5 text-lg">
          ✅
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-black text-emerald-900">Request sent to {vetName}</p>
          <p className="mt-0.5 text-sm text-emerald-900/80">
            The time is held while they reply. We have emailed you a copy.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
