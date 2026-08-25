import { useAuth } from '@/components/providers/AuthProvider';
import { NavLink, Outlet } from 'react-router-dom';

/**
 * The sections, in the order somebody works them.
 *
 * Overview first because that is the landing, then the queue that has people
 * waiting on it, then the two lists, then the log that records what was done to
 * them. `end` on the overview so it is not left highlighted on every child path.
 */
const SECTIONS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/professionals', label: 'Applications' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/blogs', label: 'Posts' },
  { to: '/admin/audit', label: 'Audit log' },
] as const;

const LINK =
  'block rounded-md px-3 py-2 text-sm font-bold transition-colors hover:bg-teal-900/5 hover:text-teal-900';
const ACTIVE = 'bg-teal-900 text-white hover:bg-teal-900 hover:text-white';
const IDLE = 'text-slate-600';

/**
 * Chrome for every admin page: the section list and where the page goes.
 *
 * A sidebar on desktop, the same list scrolled horizontally on a phone — one set
 * of links either way, so there is no second copy to keep in step. Nothing here
 * authorises anything; the gate is `RequireRole` outside it and the stored-role
 * check on every endpoint the pages inside call.
 */
export default function AdminLayout() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-[#f6fbfb] px-5 py-10 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-800">Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Platform console</h1>
          {user && (
            <p className="mt-2 text-sm text-slate-600">
              Signed in as <strong className="font-bold text-teal-900">{user.email}</strong>. Every
              decision here is recorded against this account.
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
  );
}
