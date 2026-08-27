import { useAuth } from '@/components/providers/AuthProvider';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useInvite, useOwnApplication } from '@/hooks/useProfessionals';
import { ApiError } from '@/services/api';
import type { ProfessionalInviteRefusal } from '@shared/schemas';
import { Link, useLocation, useParams } from 'react-router-dom';

import ApplicationStatus from './_components/application-status';
import InvitedApplyForm from './_components/invited-apply-form';

/**
 * What each refusal reads as on the page.
 *
 * Four sentences rather than one, because the reader's next move differs: a
 * mistyped link is worth checking, a withdrawn one is worth writing about, a spent
 * one means the application is already in, and only an expired one is worth asking
 * for another link over.
 */
const REFUSALS: Record<ProfessionalInviteRefusal, { title: string; body: string }> = {
  'not-found': {
    title: 'That link is not one of ours',
    body: 'Check that you copied the whole address out of the email — the last part is long, and mail clients sometimes break it across two lines.',
  },
  withdrawn: {
    title: 'That invitation was withdrawn',
    body: 'Something came up after it was sent. Get in touch and we will tell you where things stand.',
  },
  used: {
    title: 'That link has already been used',
    body: 'The application behind it is filed. Sign in to see where it stands.',
  },
  expired: {
    title: 'That link has expired',
    body: 'Links are good for a fortnight. Write to us and we will send another one.',
  },
};

/** How the expiry date reads to somebody about to fill the form in. */
const WHEN = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Asia/Manila',
});

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f6fbfb] px-5 py-14 text-slate-950 sm:px-8">
      <section className="mx-auto max-w-3xl">{children}</section>
    </main>
  );
}

/**
 * The page the emailed link opens.
 *
 * Public on purpose, unlike the form it holds: it has to be able to say "this
 * application is for maria@example.com, sign in as her" before it knows who is
 * looking. The token in the path survives the trip through the login page, so
 * signing in comes back here rather than to the dashboard.
 */
export default function ProfessionalInvitePage() {
  useDocumentTitle('Your application', 'Complete your Vetify professional application.');

  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const invite = useInvite(token);
  // Only asked once there is a session to ask about; it is what tells an applicant
  // who has already filed this in that they have.
  const mine = useOwnApplication();

  if (invite.isPending) {
    return (
      <Frame>
        <div aria-hidden="true" className="animate-pulse space-y-4">
          <div className="h-10 w-2/3 rounded-lg bg-slate-200" />
          <div className="h-24 rounded-lg bg-slate-200" />
          <div className="h-64 rounded-lg bg-slate-200" />
        </div>
      </Frame>
    );
  }

  if (invite.isError) {
    const error = invite.error;
    const reason =
      error instanceof ApiError && error.reason && error.reason in REFUSALS
        ? (error.reason as ProfessionalInviteRefusal)
        : null;
    const copy = reason ? REFUSALS[reason] : null;

    return (
      <Frame>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          {copy?.title ?? 'We could not open this link'}
        </h1>
        <p className="mt-4 leading-7 text-slate-600">{copy?.body ?? (error as Error).message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/contact"
            className="rounded-md bg-teal-800 px-4 py-2 text-sm font-bold text-white hover:bg-teal-900"
          >
            Get in touch
          </Link>
          {reason === 'used' && (
            <Link
              to="/professionals/apply"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white"
            >
              See your application
            </Link>
          )}
        </div>
      </Frame>
    );
  }

  const summary = invite.data;

  const header = (
    <>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Your application</h1>
      <p className="mt-4 leading-7 text-slate-600">
        This is the long form, and the only way to it is the link we sent to{' '}
        <strong>{summary.email}</strong>. It is good until{' '}
        {WHEN.format(new Date(summary.expiresAt))}.
      </p>
    </>
  );

  if (!isAuthenticated) {
    return (
      <Frame>
        {header}
        <div className="mt-8 rounded-lg border border-teal-900/15 bg-teal-50/70 p-6">
          <h2 className="text-lg font-black tracking-tight">Sign in to continue</h2>
          <p className="mt-2 leading-7 text-slate-700">
            The application hangs off an account, so that you can come back and see where it stands.
            Sign in with <strong>{summary.email}</strong> — or make an account with that address if
            you have not got one.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/login"
              state={{ from: `${location.pathname}${location.search}` }}
              className="rounded-md bg-teal-800 px-4 py-2 text-sm font-bold text-white hover:bg-teal-900"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white"
            >
              Create an account
            </Link>
          </div>
        </div>
      </Frame>
    );
  }

  if (user && user.email.trim().toLowerCase() !== summary.email) {
    return (
      <Frame>
        {header}
        <div className="mt-8 rounded-lg border border-amber-900/15 bg-amber-50/70 p-6">
          <h2 className="text-lg font-black tracking-tight">This link is for another address</h2>
          <p className="mt-2 leading-7 text-slate-700">
            You are signed in as <strong>{user.email}</strong>, and the invitation went to{' '}
            <strong>{summary.email}</strong>. Sign in as that address to fill this in — the two have
            to match, or the application would not be the one a reviewer approved.
          </p>
        </div>
      </Frame>
    );
  }

  // Already filed, either through this link or before it. The status screen is the
  // honest answer: there is nothing to fill in twice.
  if (mine.data) {
    return (
      <Frame>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Your application</h1>
        <p className="mt-4 leading-7 text-slate-600">
          This is already with us. Here is where it stands.
        </p>
        <ApplicationStatus application={mine.data} />
      </Frame>
    );
  }

  return (
    <Frame>
      {header}
      <InvitedApplyForm token={token as string} invite={summary} />
    </Frame>
  );
}
