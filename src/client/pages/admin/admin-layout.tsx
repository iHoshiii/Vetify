import ScrollToTop from '@/components/ScrollToTop';
import { NavBrand } from '@/components/navbar/nav-brand';
import LogoutModal from '@/components/settings/LogoutModal';
import { useState } from 'react';
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

const BAR_LINK = 'text-sm font-bold text-slate-600 transition-colors hover:text-teal-900';

/**
 * Chrome for every admin page: the top bar, the section list, and where the page
 * goes.
 *
 * This route sits outside `RootLayout` on purpose, so none of the public shell —
 * the marketing header, "Book Appointment", the floating settings tray — renders
 * over a console. What replaces it is the bar below: the mark, the way back out
 * to the site, and a sign-out, which are the only three things an admin needs
 * from a chrome that is not itself administrative.
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
  const [signingOut, setSigningOut] = useState(false);

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

          <div className="ml-auto flex items-center gap-4">
            <Link to="/" className={BAR_LINK}>
              View site
            </Link>
            <button type="button" onClick={() => setSigningOut(true)} className={BAR_LINK}>
              Sign out
            </button>
          </div>
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

      {/* The same modal the public tray uses, so signing out of the console goes
          through one implementation of it and not a second copy. */}
      <LogoutModal isOpen={signingOut} onClose={() => setSigningOut(false)} />
    </div>
  );
}
