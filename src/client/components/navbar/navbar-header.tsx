import { useAuth } from '@/components/providers/AuthProvider';
import { useEffect, useState } from 'react';
import { Hamburger } from './hamburger';
import { MobileMenu } from './mobile-view';
import { NavActions } from './nav-actions';
import { NavBrand } from './nav-brand';
import { NavLinks } from './nav-links';

export default function SiteHeader() {
  // Read from the provider, not localStorage. The header outlives every
  // client-side navigation, so a snapshot taken on mount would keep showing
  // "Log in" until a full page reload replaced the component.
  const { isAuthenticated, user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const showAuthActions = !isAuthenticated;
  // Hides a link, nothing more: /admin is gated by RequireRole and every endpoint
  // behind it re-reads the stored role, so a forged flag here buys 403s.
  const isAdmin = user?.role === 'admin';

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-md'
          : 'border-b border-slate-200 bg-white'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
        <NavBrand />
        <NavLinks isAuthenticated={isAuthenticated} />
        <NavActions
          isAuthenticated={isAuthenticated}
          showAuthActions={showAuthActions}
          isAdmin={isAdmin}
        />
        <Hamburger isOpen={menuOpen} onToggle={() => setMenuOpen((v) => !v)} />
      </div>
      <MobileMenu
        isOpen={menuOpen}
        isAuthenticated={isAuthenticated}
        showAuthActions={showAuthActions}
        isAdmin={isAdmin}
        onClose={() => setMenuOpen(false)}
      />
    </header>
  );
}
