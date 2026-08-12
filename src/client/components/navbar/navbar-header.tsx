import { readAuthState } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { Hamburger } from './hamburger';
import { MobileMenu } from './mobile-view';
import { NavActions } from './nav-actions';
import { NavBrand } from './nav-brand';
import { NavLinks } from './nav-links';

export default function SiteHeader() {
  const [authState, setAuthState] = useState(() => readAuthState());
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setAuthState(readAuthState());
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isAuthenticated = Boolean(authState?.user);
  const showAuthActions = !isAuthenticated;

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
        <NavActions isAuthenticated={isAuthenticated} showAuthActions={showAuthActions} />
        <Hamburger isOpen={menuOpen} onToggle={() => setMenuOpen((v) => !v)} />
      </div>
      <MobileMenu
        isOpen={menuOpen}
        isAuthenticated={isAuthenticated}
        showAuthActions={showAuthActions}
        onClose={() => setMenuOpen(false)}
      />
    </header>
  );
}
