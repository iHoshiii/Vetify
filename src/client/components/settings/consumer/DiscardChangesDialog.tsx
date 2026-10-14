import { useLayoutEffect } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export default function DiscardChangesDialog({
  onStay,
  onLeave,
}: {
  onStay: () => void;
  onLeave: () => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(onStay);
  useBodyScrollLock();
  useLayoutEffect(() => {
    const previousFocus = document.activeElement;
    return () => {
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="discard-settings-title"
        aria-describedby="discard-settings-description"
        tabIndex={-1}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl outline-none"
      >
        <h2 id="discard-settings-title" className="text-xl font-bold text-slate-900">
          Discard unsaved changes?
        </h2>
        <p id="discard-settings-description" className="mt-2 text-sm text-slate-600">
          Your changes have not been saved. Stay here to save them, or discard them to leave.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onStay}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            Stay here
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-800"
          >
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}
