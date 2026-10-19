import { renderToString } from 'react-dom/server';
import type { ComponentType } from 'react';
import { StaticRouter } from 'react-router-dom/server.js';

import SiteHeader from '@/components/navbar/navbar-header';
import { AuthProvider } from '@/components/providers/AuthProvider';
import HomePage from '@/pages/home-page';
import AboutPage from '@/pages/about/about-page';
import ServicesPage from '@/pages/services/services-page';
import ProfessionalsPage from '@/pages/professionals/professionals-page';
import ContactPage from '@/pages/contact/contact-page';
import HelpPage from '@/pages/help/help-page';
import PrivacyPage from '@/pages/privacy/privacy-page';
import TermsPage from '@/pages/terms/terms-page';

const pages: Record<string, ComponentType> = {
  '/': HomePage,
  '/about': AboutPage,
  '/services': ServicesPage,
  '/professionals': ProfessionalsPage,
  '/contact': ContactPage,
  '/help': HelpPage,
  '/privacy': PrivacyPage,
  '/terms': TermsPage,
};

export function renderPublicPage(pathname: string): string {
  const Page = pages[pathname];
  if (!Page) throw new Error(`No public renderer for ${pathname}`);
  const html = renderToString(
    <StaticRouter location={pathname}>
      <AuthProvider>
        <SiteHeader />
        <Page />
      </AuthProvider>
    </StaticRouter>
  );
  return html.replace(
    /class="([^"]*\breveal(?:-left|-right|-scale)?\b[^"]*)"/g,
    (_, value: string) => `class="${value} is-visible"`
  );
}
