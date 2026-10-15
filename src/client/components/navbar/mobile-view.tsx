import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { SiteLink } from '@/components/common/site-link';
import { NAV_ITEMS, TOOLS_ITEMS } from './nav-data';

interface MobileMenuProps {
  isOpen: boolean;
  showAuthActions: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, showAuthActions, onClose }: MobileMenuProps) {
  useBodyScrollLock(isOpen);
  useEffect(() => {
    if (!isOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div
      id="mobile-navigation"
      className="absolute inset-x-0 top-full max-h-[calc(var(--viewport-height,100dvh)-68px)] overflow-y-auto overscroll-contain border-t border-slate-200 bg-white shadow-lg xl:hidden"
    >
      <nav
        aria-label="Mobile navigation"
        className="flex flex-col gap-1 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
      >
        {NAV_ITEMS.map((item) => (
          <SiteLink
            key={item.href}
            to={item.href}
            onClick={onClose}
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-vet-bg hover:text-vet-primary"
          >
            {item.label}
          </SiteLink>
        ))}

        <div className="my-1 h-px bg-slate-100" />
        <p className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-400">
          Tools
        </p>

        <Link
          to="/map"
          onClick={onClose}
          className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-vet-bg hover:text-vet-primary"
        >
          Find Vets
        </Link>

        {TOOLS_ITEMS.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={onClose}
            className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-vet-bg hover:text-vet-primary"
          >
            {item.label}
          </Link>
        ))}

        <div className="my-2 h-px bg-slate-100" />

        <Link
          to="/book-appointment"
          className="rounded-xl bg-vet-primary px-4 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-vet-primary-dark"
          onClick={onClose}
        >
          Book Appointment
        </Link>

        {showAuthActions && (
          <div className="mt-1 flex gap-2">
            <Link
              to="/login"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 hover:border-vet-primary"
              onClick={onClose}
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 hover:border-vet-primary"
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
