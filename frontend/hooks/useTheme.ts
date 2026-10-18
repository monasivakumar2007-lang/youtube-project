// ============================================================
// hooks/useTheme.ts
// Theme hook — STUB (Phase 2)
// ============================================================
// Will:
//   1. Read ThemePreference from user profile (API) or localStorage
//   2. Call applyTheme() from lib/theme.ts on mount
//   3. Re-apply when preference changes
//   4. In AUTO mode, set up an interval to re-check every minute
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import type { ThemePreference } from '@/types';
import { applyTheme } from '@/lib/theme';

export function useTheme(initialPreference: ThemePreference = 'AUTO') {
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);

  useEffect(() => {
    applyTheme(preference);

    // In AUTO mode, re-evaluate every minute
    if (preference !== 'AUTO') return;
    const interval = setInterval(() => applyTheme('AUTO'), 60_000);
    return () => clearInterval(interval);
  }, [preference]);

  return { preference, setPreference };
}
