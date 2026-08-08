import { Outlet } from 'react-router-dom';

import FloatingSettings from '@/components/FloatingSettings';
import RevealObserver from '@/components/RevealObserver';
import ScrollToTop from '@/components/ScrollToTop';
import SiteHeader from '@/components/SiteHeader';

/**
 * Port of the former src/app/layout.tsx. The <html>/<body> tags now live in
 * index.html, and the providers moved up to main.tsx so they sit outside the
 * router. What remains is the chrome every route shares.
 */
export default function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <RevealObserver />
      <SiteHeader />
      <FloatingSettings />
      <Outlet />
    </>
  );
}
