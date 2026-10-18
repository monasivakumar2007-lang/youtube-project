'use client';

// ============================================================
// app/Providers.tsx
// Single client boundary for all context providers.
// This ensures ALL provider code stays 100% client-side,
// never executing on the server where localStorage is absent.
// ============================================================

import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { type ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
