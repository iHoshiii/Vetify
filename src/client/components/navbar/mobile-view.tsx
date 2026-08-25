import { Link } from 'react-router-dom';
import { NAV_ITEMS, TOOLS_ITEMS } from './nav-data';

interface MobileMenuProps {
  isOpen: boolean;
  isAuthenticated: boolean;
  showAuthActions: boolean;
  /** Whether to offer the console. Not a permission - see navbar-header. */
  isAdmin: boolean;
  onClose: () => void;
}

export function MobileMenu({
  isOpen,
  isAuthenticated,
  showAuthActions,
  isAdmin,
  onClose,
}: MobileMenuProps) {
  return (
    <div
      className={`overflow-hidden transition-all duration-300 md:hidden ${
        isOpen ? 'max-h-[600px] border-t border-slate-200' : 'max-h-0'
      }`}
    >
      <nav className="flex flex-col gap-1 bg-white px-5 pb-4 pt-2">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
          >
            {item.label}
          </a>
        ))}

        <div className="my-1 h-px bg-slate-100" />
        <p className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-400">
          Tools
        </p>

        {!isAuthenticated && (
          <Link
            to="/map"
            onClick={onClose}
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
          >
            📍 Find Vets
          </Link>
        )}

        {TOOLS_ITEMS.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={onClose}
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700"
          >
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <Link
            to="/admin"
            onClick={onClose}
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-50"
          >
            Admin console
          </Link>
        )}

        <div className="my-2 h-px bg-slate-100" />

        <Link
          to="/book-appointment"
          className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-4 py-2.5 text-center text-sm font-bold text-white shadow-md"
          onClick={onClose}
        >
          Book Appointment
        </Link>

        {showAuthActions && (
          <div className="mt-1 flex gap-2">
            <Link
              to="/login"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 hover:border-teal-300"
              onClick={onClose}
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 hover:border-teal-300"
              onClick={onClose}
            >
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
}
