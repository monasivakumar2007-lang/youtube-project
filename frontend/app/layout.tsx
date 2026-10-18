// ============================================================
// app/layout.tsx — Root Layout (SERVER COMPONENT)
// Providers are delegated to a single 'use client' boundary.
// ============================================================
import type { Metadata } from 'next';
import '../styles/globals.css';
import Providers from './Providers';

export const metadata: Metadata = {
  title: {
    default: 'StreamVault — Watch, Stream & Connect',
    template: '%s | StreamVault',
  },
  description:
    'StreamVault is a modern video streaming and social platform. Watch HD videos, join live watch parties, and connect with creators.',
  keywords: ['video streaming', 'watch party', 'HD video', 'social platform'],
  authors: [{ name: 'StreamVault Team' }],
  openGraph: {
    type: 'website',
    siteName: 'StreamVault',
    title: 'StreamVault — Watch, Stream & Connect',
    description: 'A modern video streaming and social platform.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
