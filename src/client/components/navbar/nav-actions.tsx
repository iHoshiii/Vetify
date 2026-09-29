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
          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 transition-colors hover:border-vet-primary hover:text-vet-primary"
        >
          Find Vets
        </Link>
      )}
      <Link
        to="/book-appointment"
        className="inline-flex h-9 items-center justify-center rounded-xl bg-vet-primary px-5 text-sm font-bold text-white transition-colors hover:bg-vet-primary-dark"
      >
        Book Appointment
      </Link>
      {showAuthActions && (
        <>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-vet-primary"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:border-vet-primary hover:text-vet-primary"
            >
              Sign up
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
