// ============================================================
// components/auth/AuthCard.tsx
// Glassmorphism card wrapping all auth forms
// ============================================================
'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] px-4 py-12">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[var(--brand)] opacity-5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-600 opacity-5 blur-3xl" />
      </div>

      {/* Logo */}
      <Link
        href="/"
        id="auth-logo-link"
        className="flex items-center gap-2 mb-8 group"
      >
        <span className="text-2xl">🎬</span>
        <span className="font-display text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
          StreamVault
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md glass rounded-2xl p-8 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>

        {/* Form content */}
        <div>{children}</div>

        {/* Footer */}
        {footer && (
          <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
