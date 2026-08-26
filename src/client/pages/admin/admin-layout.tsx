import { useAuth } from '@/components/providers/AuthProvider';
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
 * A sidebar on desktop, the same list scrolled horizontally on a phone — one set
 * of links either way, so there is no second copy to keep in step. Nothing here
 * authorises anything; the gate is `RequireRole` outside it and the stored-role
 * check on every endpoint the pages inside call.
 */
export default function AdminLayout() {
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="min-h-screen bg-[#f6fbfb] text-slate-950">
      <ScrollToTop />

      <div className="border-b border-teal-900/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3 sm:px-8">
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

      <main className="px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <header>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Platform console</h1>
            {user && (
              <p className="mt-2 text-sm text-slate-600">
                Signed in as <strong className="font-bold text-teal-900">{user.email}</strong>.
                Every decision here is recorded against this account.
              </p>
            )}
          </header>

          <div className="mt-8 gap-8 lg:flex">
            <nav aria-label="Admin sections" className="lg:w-52 lg:shrink-0">
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
          </div>
        </div>
      </main>

      {/* The same modal the public tray uses, so signing out of the console goes
          through one implementation of it and not a second copy. */}
      <LogoutModal isOpen={signingOut} onClose={() => setSigningOut(false)} />
    </div>
  );
}
