import ScrollToTop from '@/components/ScrollToTop';
import { NavBrand } from '@/components/navbar/nav-brand';
import { useAdminBlogs } from '@/hooks/useAdminBlogs';
import { useAdminInquiries } from '@/hooks/useAdminInquiries';
import { useAdminProfessionals } from '@/hooks/useAdminProfessionals';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

import { GROUND, badgeOf } from './_components/ui';

/**
 * The sections, in the order somebody works them.
 *
 * Overview first because that is the landing, then the applications waiting on
 * somebody, then the accounts they turn into, then the writing on them, then the log
 * of what was done to any of it. `end` on the overview so it is not left highlighted
 * on every child path.
 *
 * Applications is one entry with three phases inside it, and Users is one with two
 * views of the same people. Both are worked through rather than picked between,
 * which is why the sidebar lists the major workspaces rather than every view.
 */
const SECTIONS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/applications', label: 'Applications' },
  { to: '/admin/blogs', label: 'Posts' },
  { to: '/admin/applications/statistics', label: 'Statistics', end: true },
  { to: '/admin/audit', label: 'Audit log' },
] as const;

const LINK =
  'flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-700';
const ACTIVE = 'bg-forest-800 text-white';
const IDLE = 'text-slate-600 hover:bg-forest-100 hover:text-forest-800';

const BADGE =
  'inline-flex min-w-[1.5rem] shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums';
const BADGE_ACTIVE = 'bg-white text-forest-800';
const BADGE_IDLE = 'bg-forest-800 text-white';

/**
 * Chrome for every admin page: the top bar, the section list, and where the page
 * goes.
 *
 * This route sits outside `RootLayout` on purpose, so none of the public shell —
 * the marketing header, "Book Appointment", the floating settings tray — renders
 * over a console. What replaces it is the bar below: the mark and the way back out
 * to the site. Signing out is not in it — leaving is one click, and the tray on
 * the site is where every other account ends a session, so a second copy of that
 * control here would be a second thing to keep in step.
 *
 * Full width, and no page title above the sections. A console is a workspace: the
 * tables in it have five columns and a pager, and a reading measure with a banner
 * over it spends the two things those actually want. Which page you are on is
 * already said by the highlighted section beside it and by the tab title.
 *
 * A sidebar on desktop, the same list scrolled horizontally on a phone — one set
 * of links either way, so there is no second copy to keep in step. Nothing here
 * authorises anything; the gate is `RequireRole` outside it and the stored-role
 * check on every endpoint the pages inside call.
 */
export default function AdminLayout() {
  const location = useLocation();

  // The same list queries the pages themselves read, asked for one row because only
  // the total is wanted. Counting off the metrics aggregate instead left the badge a
  // minute behind its own queue, and left the Request tab out of Applications
  // altogether — that tab is a queue too, and the sidebar covers both.
  const requests = useAdminInquiries({ status: 'pending', limit: 1 }).data?.total ?? 0;
  const applications = useAdminProfessionals({ status: 'pending', limit: 1 }).data?.total ?? 0;
  const held = useAdminBlogs({ status: 'flagged', limit: 1 }).data?.total ?? 0;

  const WAITING: Record<string, number> = {
    '/admin/applications': requests + applications,
    '/admin/blogs': held,
  };

  return (
    <div className={`min-h-screen ${GROUND}`}>
      <ScrollToTop />

      {/* Follows the page like the site header does. Solid rather than the site's
          translucent scrolled state: tables would show through it. */}
      <div className="sticky top-0 z-50 border-b border-forest-200 bg-white">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {/* To the console, not to the marketing site: leaving is the explicit
              link beside it rather than the thing you hit by aiming for home. */}
          <NavBrand to="/admin" />
          <span className="rounded-md bg-forest-800 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
            Admin
          </span>

          {/* An outline rather than plain text: a lone unstyled link in an otherwise
              empty bar reads as a caption. Flat, because a console's chrome should be
              the quietest thing on the page. */}
          <Link
            to="/"
            className="ml-auto inline-flex h-9 items-center justify-center rounded-md border border-forest-200 bg-white px-4 text-sm font-bold text-forest-700 transition-colors hover:bg-forest-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-700"
          >
            View User Console
          </Link>
        </div>
      </div>

      {/* No max-width. A console is a workspace: its tables have five columns, a
          pager and a filter row, and a reading measure would spend the width they
          want on empty margin. */}
      <main className="gap-6 px-4 py-6 sm:px-6 lg:flex lg:gap-8 lg:px-8">
        <nav aria-label="Admin sections" className="lg:w-52 lg:shrink-0">
          {/* Scrolls sideways under lg, stacks above it. */}
          <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:px-0 lg:pb-0">
            {SECTIONS.map((section) => {
              const waiting = WAITING[section.to] ?? 0;
              const statisticsIsOpen = location.pathname === '/admin/applications/statistics';
              const activeSection = section.to === '/admin/applications' ? !statisticsIsOpen : true;

              return (
                <li key={section.to} className="shrink-0 lg:shrink">
                  <NavLink
                    to={section.to}
                    end={'end' in section ? section.end : false}
                    className={({ isActive }) =>
                      `${LINK} ${isActive && activeSection ? ACTIVE : IDLE}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {section.label}
                        {/* Absent at zero rather than a nought on every row: the badge is
                            there to be noticed, and one that is always there is not. */}
                        {waiting > 0 && (
                          <span
                            className={`${BADGE} ${
                              isActive && activeSection ? BADGE_ACTIVE : BADGE_IDLE
                            }`}
                          >
                            {badgeOf(waiting)}
                            <span className="sr-only"> waiting</span>
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-6 min-w-0 flex-1 lg:mt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
