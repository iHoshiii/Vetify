import { useAuth } from '@/components/providers/AuthProvider';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Hamburger } from './hamburger';
import { HeaderTools } from './header-tools';
import { MobileMenu } from './mobile-view';
import { NavActions } from './nav-actions';
import { NavBrand } from './nav-brand';
import { NavLinks } from './nav-links';
import { MobileQuickNav } from './mobile-quick-nav';
import { useHeaderHeight } from './use-header-height';

export default function SiteHeader() {
  // Read from the provider, not localStorage. The header outlives every
  // client-side navigation, so a snapshot taken on mount would keep showing
  // "Log in" until a full page reload replaced the component.
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const headerRef = useHeaderHeight();
  useEffect(() => setMenuOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const desktop = window.matchMedia('(min-width: 1280px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const showAuthActions = !isAuthenticated;

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-md'
          : 'border-b border-slate-200 bg-white'
      }`}
    >
      <div className="mx-auto flex min-h-[68px] max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-8 xl:flex-nowrap">
        <NavBrand />
        <NavLinks isAuthenticated={isAuthenticated} />
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
          <NavActions isAuthenticated={isAuthenticated} showAuthActions={showAuthActions} />
          {isAuthenticated && <div className="hidden h-6 w-px bg-slate-200 xl:block" />}
          <HeaderTools />
          <Hamburger isOpen={menuOpen} onToggle={() => setMenuOpen((v) => !v)} />
        </div>
      </div>
      <MobileQuickNav />
      <MobileMenu
        isOpen={menuOpen}
        showAuthActions={showAuthActions}
        onClose={() => setMenuOpen(false)}
      />
    </header>
  );
}
