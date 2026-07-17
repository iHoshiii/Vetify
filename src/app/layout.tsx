import FloatingSettings from '@/components/FloatingSettings';
import RevealObserver from '@/components/RevealObserver';
import SiteHeader from '@/components/SiteHeader';
import { AuthProvider } from '@/components/providers/AuthProvider';
import type { Metadata } from 'next';
import React from 'react';
import { ReactQueryProvider } from '../components/providers/ReactQueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vetify',
  description: "Your pet's health companion",
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <ReactQueryProvider>
            <RevealObserver />
            <SiteHeader />
            <FloatingSettings />
            {children}
          </ReactQueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
