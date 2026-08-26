import ScrollToTop from '@/components/ScrollToTop';
import { NavBrand } from '@/components/navbar/nav-brand';
import { Link, NavLink, Outlet } from 'react-router-dom';

/**
 * The sections, in the order somebody works them.
 *
 * Overview first because that is the landing, then the people, then their
 * writing, then the log that records what was done to either. `end` on the
 * overview so it is not left highlighted on every child path.
 *
 * Accounts, professionals and the application queue are one entry, not three:
 * they are three views of the same decision, and they have their own tabs inside.
 */
const SECTIONS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/blogs', label: 'Posts' },
  { to: '/admin/audit', label: 'Audit log' },
] as const;

const LINK =
  'block rounded-md px-3 py-2 text-sm font-bold transition-colors hover:bg-teal-900/5 hover:text-teal-900';
const ACTIVE = 'bg-teal-900 text-white hover:bg-teal-900 hover:text-white';
const IDLE = 'text-slate-600';

/**
 * The way out, drawn as a control rather than as a word.
 *
 * It was plain text next to a sign-out that has since gone, and a lone unstyled
 * link in an otherwise empty bar reads as a caption. An outline is what says it
 * can be clicked.
 */
const BAR_LINK =
  'inline-flex h-9 items-center justify-center rounded-xl border border-teal-900/20 bg-white px-4 text-sm font-bold text-teal-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-700 hover:shadow-md';

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
  return (
    <div className="min-h-screen bg-[#f6fbfb] text-slate-950">
      <ScrollToTop />

      <div className="border-b border-teal-900/10 bg-white">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          {/* To the console, not to the marketing site: leaving is the explicit
              link beside it rather than the thing you hit by aiming for home. */}
          <NavBrand to="/admin" />
          <span className="rounded-md bg-teal-900 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.18em] text-white">
            Admin
          </span>

          <Link to="/" className={`ml-auto ${BAR_LINK}`}>
            View site
          </Link>
        </div>
      </div>

      <main className="gap-6 px-4 py-6 sm:px-6 lg:flex lg:gap-8">
        <nav aria-label="Admin sections" className="lg:w-48 lg:shrink-0">
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
          <Outlet />
        </div>
      </main>
    </div>
  );
}
