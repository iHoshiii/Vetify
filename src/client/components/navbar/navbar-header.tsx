import { useAuth } from '@/components/providers/AuthProvider';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BrandLogo } from '@/components/common/brand-logo';
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

  if (location.pathname === '/anatomy' || location.pathname.startsWith('/anatomy/')) {
    return (
      <header ref={headerRef} className="sticky top-0 z-50 border-b border-slate-100 bg-white">
        <div className="flex min-h-[68px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/services"
            aria-label="Vetify Anatomy"
            className="flex shrink-0 items-center gap-2.5"
          >
            <BrandLogo className="h-8 w-8 rounded-lg" />
            <span className="text-base font-semibold text-teal-900">Anatomy</span>
          </Link>
          <nav
            aria-label="Anatomy navigation"
            className="flex items-center gap-4 text-xs text-slate-600 sm:gap-6 sm:text-sm"
          >
            <Link
              to="/chat"
              className="flex min-h-11 items-center rounded-md hover:text-teal-700 focus-visible:outline-teal-700"
            >
              Ask Vetify
            </Link>
            <Link
              to="/services"
              className="flex min-h-11 items-center rounded-md hover:text-teal-700 focus-visible:outline-teal-700"
            >
              Back to Vetify
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-md'
          : 'border-b border-slate-200 bg-white'
      }`}
    >
      <div className="mx-auto flex min-h-[68px] max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-8">
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
