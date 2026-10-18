'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-7xl font-extrabold text-[var(--brand)] mb-4">404</h1>
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Page Not Found</h2>
      <p className="text-[var(--text-secondary)] max-w-md mb-8">
        The page you are looking for does not exist, has been removed, or is temporarily unavailable.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-xl bg-[var(--brand)] text-white font-medium hover:bg-[var(--brand-hover)] transition-all shadow-lg"
      >
        Back to Home
      </Link>
    </div>
  );
}
