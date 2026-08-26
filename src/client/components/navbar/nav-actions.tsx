import { Link } from 'react-router-dom';

interface NavActionsProps {
  isAuthenticated: boolean;
  showAuthActions: boolean;
}

export function NavActions({ isAuthenticated, showAuthActions }: NavActionsProps) {
  return (
    <div className="hidden items-center gap-3 md:flex">
      {isAuthenticated && (
        <Link
          to="/map"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg"
        >
          Find Vets
        </Link>
      )}
      <Link
        to="/book-appointment"
        className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-5 text-sm font-bold text-white shadow-md shadow-teal-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/30"
      >
        Book Appointment
      </Link>
      {showAuthActions && (
        <>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-teal-700"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
            >
              Sign up
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
