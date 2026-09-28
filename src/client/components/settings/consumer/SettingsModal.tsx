import type { ReactNode } from 'react';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';

// A centered popup for one settings section; Escape, the backdrop, and Close all dismiss it.
export function SettingsModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(onClose, true);
  useBodyScrollLock(true);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl outline-none"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-black tracking-tight text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
