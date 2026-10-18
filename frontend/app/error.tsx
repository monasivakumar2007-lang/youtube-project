'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-extrabold text-red-500 mb-4">500</h1>
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Something went wrong</h2>
      <p className="text-[var(--text-secondary)] max-w-md mb-8">
        An unexpected error occurred. Please try again or return to the homepage.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-3 rounded-xl bg-[var(--brand)] text-white font-medium hover:bg-[var(--brand-hover)] transition-all"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium hover:bg-[var(--border-color)] transition-all"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
