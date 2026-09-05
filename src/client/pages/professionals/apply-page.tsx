import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useOwnApplication } from '@/hooks/useProfessionals';
import { Link } from 'react-router-dom';

import ApplicationStatus from './_components/application-status';
import InquiryForm from './_components/inquiry-form';

/**
 * Stage one, and whatever came of it.
 *
 * Two screens in one, chosen by what the caller already has: an application on
 * file gets the status view, and everybody else gets the short enquiry form. The
 * long form is not here; it lives behind the emailed link.
 *
 * RequireAuth stands in front of the route, so there is a session by the time any
 * of this renders.
 */
export default function ProfessionalApplyPage() {
  useDocumentTitle(
    'Apply to join',
    'Write in about being listed as a verified veterinary professional on Vetify.'
  );

  // Disabled without a session of its own accord, which is what keeps a render
  // that somehow arrives anonymously from asking for an application nobody has.
  const query = useOwnApplication();
  const application = query.data;

  return (
    <main className="min-h-screen bg-[#f6fbfb] px-5 py-14 text-slate-950 sm:px-8">
      <section className="mx-auto max-w-3xl">
        <Link
          to="/professionals"
          className="text-sm font-bold uppercase tracking-[0.22em] text-teal-800 hover:underline"
        >
          ← Professionals
        </Link>

        <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
          {application ? 'Your application' : 'Apply to join'}
        </h1>
        {application && (
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Where your application stands, and what you told us.
          </p>
        )}

        {query.isLoading ? (
          // Shaped like the form so the page does not jump when the answer lands.
          <div aria-hidden="true" className="mt-10 animate-pulse space-y-4">
            <div className="h-10 rounded-lg bg-slate-200" />
            <div className="h-10 rounded-lg bg-slate-200" />
            <div className="h-24 rounded-lg bg-slate-200" />
          </div>
        ) : query.isError ? (
          <div
            role="alert"
            className="mt-10 rounded-lg border border-amber-900/15 bg-amber-50/70 p-6"
          >
            <h2 className="text-lg font-black tracking-tight">We could not load this.</h2>
            <p className="mt-2 leading-7 text-slate-600">{(query.error as Error).message}</p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="mt-4 rounded-md bg-teal-800 px-4 py-2 text-sm font-bold text-white hover:bg-teal-900"
            >
              Try again
            </button>
          </div>
        ) : application ? (
          <ApplicationStatus application={application} />
        ) : (
          <InquiryForm />
        )}
      </section>
    </main>
  );
}
