import FloatingSettings from '@/components/FloatingSettings';
import { NavBrand } from '@/components/navbar/nav-brand';
import ScrollToTop from '@/components/ScrollToTop';
import { useOwnApplication } from '@/hooks/useProfessionals';
import type { OwnProfessional } from '@/services/professionals.service';
import { AlertCircle, Award, Eye } from 'lucide-react';
import { Link, NavLink, Outlet, useOutletContext } from 'react-router-dom';

import ApplicationStatus from './_components/application-status';
import { LockedApplicationDetails } from './_components/locked-application-details';

/**
 * The views of a working day, in the order a vet opens them. Appointments is the index,
 * so `end` keeps it from staying lit on the pages below it. Map & Location sits last
 * because it is set once and then left alone, unlike the three above it.
 */
const SECTIONS = [
  { to: '/professionals/dashboard', label: 'Appointments', end: true },
  { to: '/professionals/dashboard/conversations', label: 'Conversations' },
  { to: '/professionals/dashboard/history', label: 'History & Logs' },
  { to: '/professionals/dashboard/location', label: 'Map & Location' },
] as const;

const LINK =
  'block rounded-md px-3 py-2 text-sm font-bold transition-colors hover:bg-teal-900/5 hover:text-teal-900';
const ACTIVE = 'bg-teal-900 text-white hover:bg-teal-900 hover:text-white';
const IDLE = 'text-slate-600';

const BAR_LINK =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-teal-900/20 bg-white px-3 text-sm font-bold text-teal-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-700 hover:shadow-md sm:px-4';

const BAR_LINK_ACTIVE =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-teal-800 bg-teal-800 px-3 text-sm font-bold text-white shadow-sm transition-all duration-200 sm:px-4';

/** What the layout has already established before any page inside it renders. */
type ConsoleContext = { application: OwnProfessional };

/**
 * The verified application, resolved once by the layout.
 *
 * Every page in the console needs it and none of them can render without it, so
 * the loading, error and not-yet-verified states are handled in one place and the
 * pages get a value that is simply there.
 */
export function useConsoleApplication(): OwnProfessional {
  return useOutletContext<ConsoleContext>().application;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">{children}</div>;
}

function Bar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="border-b border-teal-900/10 bg-white">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <NavBrand to="/professionals/dashboard" />
        <span className="rounded-md bg-teal-900 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.18em] text-white">
          Professional
        </span>

        <div className="ml-auto flex items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

/**
 * Chrome for every page of the professional console.
 *
 * Same shape as the admin console — a bar, a section list down the left, the page
 * beside it — because they are the same kind of thing: a workspace, not a page on
 * the marketing site. It sits outside `RootLayout` for that reason, so the public
 * header and "Book Appointment" do not draw over a working day.
 *
 * The application is fetched here and nowhere below. A console with no verified
 * licence behind it has no appointments, no conversations and no listing, so there
 * is one gate rather than the same four branches copied into every page.
 */
export default function ProfessionalLayout() {
  const { data: application, isLoading, isError, error } = useOwnApplication();

  const shell = (children: React.ReactNode, bar?: React.ReactNode) => (
    <div className="min-h-screen bg-[#f6fbfb] text-slate-950">
      <ScrollToTop />
      <Bar>{bar}</Bar>
      {children}
    </div>
  );

  const exit = (
    <Link to="/" className={BAR_LINK}>
      Switch to User Console
    </Link>
  );

  if (isLoading) {
    return shell(
      <Centered>
        <div className="animate-pulse space-y-5">
          <div className="h-24 rounded-xl bg-slate-200" />
          <div className="h-64 rounded-xl bg-slate-200" />
        </div>
      </Centered>,
      exit
    );
  }

  if (isError) {
    return shell(
      <Centered>
        <div className="mx-auto max-w-md space-y-4 rounded-xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="text-lg font-bold text-slate-900">Unable to load your console</h2>
          <p className="text-xs text-slate-600">{error.message || 'An error occurred.'}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-teal-800 px-4 py-2 text-xs font-bold text-white hover:bg-teal-900"
          >
            Try again
          </button>
        </div>
      </Centered>,
      exit
    );
  }

  if (!application) {
    return shell(
      <Centered>
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-teal-800">
            <Award className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Nothing filed yet</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              You have not filed a professional partner application. Apply to take bookings and
              offer consultations.
            </p>
          </div>
          <Link
            to="/professionals/apply"
            className="inline-block rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-900"
          >
            Apply to join Vetify
          </Link>
        </div>
      </Centered>,
      exit
    );
  }

  // Under review: the sections behind this would all be empty, and the settings
  // tray edits a listing that is not live yet, so neither is drawn.
  if (application.status !== 'verified') {
    return shell(
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Application Progress
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track your verification status and review your submitted details.
          </p>
        </div>
        <ApplicationStatus application={application} />
        <LockedApplicationDetails application={application} />
      </main>,
      exit
    );
  }

  return shell(
    <>
      <main className="gap-6 px-4 py-6 sm:px-6 lg:flex lg:gap-8">
        <nav aria-label="Console sections" className="lg:w-48 lg:shrink-0">
          {/* Scrolls sideways under lg, stacks above it. */}
          <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:px-0 lg:pb-0">
            {SECTIONS.map((section) => (
              <li key={section.to} className="shrink-0 lg:shrink">
                <NavLink
                  to={section.to}
                  end={'end' in section ? section.end : false}
                  className={({ isActive }) => `${LINK} ${isActive ? ACTIVE : IDLE}`}
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6 min-w-0 flex-1 lg:mt-0">
          <Outlet context={{ application } satisfies ConsoleContext} />
        </div>
      </main>

      <FloatingSettings variant="professional" />
    </>,
    <>
      <NavLink
        to="/professionals/dashboard/profile"
        className={({ isActive }) => (isActive ? BAR_LINK_ACTIVE : BAR_LINK)}
      >
        <Eye className="h-3.5 w-3.5" />
        Profile
      </NavLink>
      {exit}
    </>
  );
}
