import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/map', label: 'Find Vets' },
  { to: '/book-appointment', label: 'Book Vet' },
];

export function MobileQuickNav() {
  return (
    <nav
      aria-label="Quick navigation"
      className="grid grid-cols-4 border-t border-slate-100 bg-white xl:hidden"
    >
      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={() => {
            if (to === '/') window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
          }}
          className={({ isActive }) =>
            `flex min-h-11 min-w-0 items-center justify-center border-b-2 px-1 text-center text-xs font-semibold transition-colors sm:text-sm ${
              isActive
                ? 'border-vet-primary text-vet-primary'
                : 'border-transparent text-slate-600 hover:border-vet-primary hover:text-vet-primary'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
