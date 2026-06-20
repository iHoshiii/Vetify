import type { Metadata } from 'next';
import React from 'react';
import SiteHeader from '@/components/SiteHeader';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vetify',
  description: "Your pet's health companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
