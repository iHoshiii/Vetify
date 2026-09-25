import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { X } from 'lucide-react';

import RateForm from './rate-form';

// The post-call rating, shown as its own dialog on the appointments page so the stars never live inside the call room.
export default function RatePopup({
  appointmentId,
  onClose,
}: {
  appointmentId: string;
  onClose: () => void;
}) {
  useBodyScrollLock();
  const dialogRef = useFocusTrap<HTMLElement>(onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Rate your experience"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <RateForm appointmentId={appointmentId} heading="Rate your experience" />
      </section>
    </div>
  );
}
