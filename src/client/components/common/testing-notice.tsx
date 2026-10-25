import { useEffect, useRef } from 'react';
import { FlaskConical } from 'lucide-react';

const ACKNOWLEDGED_KEY = 'vetify-testing-notice-acknowledged';

export default function TestingNotice() {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(ACKNOWLEDGED_KEY) === 'true') return;
    } catch {
      // Keep the notice usable when browser storage is unavailable.
    }
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  function acknowledge() {
    try {
      sessionStorage.setItem(ACKNOWLEDGED_KEY, 'true');
    } catch {
      // Dismissal still works without storing the acknowledgement.
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="testing-notice-title"
      aria-describedby="testing-notice-description"
      onCancel={acknowledge}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-teal-100 bg-white p-6 text-slate-800 shadow-2xl backdrop:bg-slate-950/50 sm:p-8"
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
        <FlaskConical size={24} aria-hidden="true" />
      </div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-700">
        Testing notice
      </p>
      <h2 id="testing-notice-title" className="text-2xl font-bold tracking-tight text-slate-950">
        Vetify is currently available for testing only
      </h2>
      <p id="testing-notice-description" className="mt-4 text-sm leading-6 text-slate-600">
        The website is still under development and is not currently operating as a live service.
        You&apos;re welcome to explore and test it, but some features may be incomplete or
        unavailable.
      </p>
      <form method="dialog" onSubmit={acknowledge} className="mt-6">
        <button
          type="submit"
          className="min-h-11 w-full rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          Continue testing
        </button>
      </form>
    </dialog>
  );
}
