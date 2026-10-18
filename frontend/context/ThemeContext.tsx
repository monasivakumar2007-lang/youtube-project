'use client';

// ============================================================
// context/ThemeContext.tsx
// Manages AUTO / LIGHT / DARK theme with IST time detection
// AUTO: 10:00–12:00 IST → LIGHT, all other times → DARK
// ============================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import type { ThemePreference } from '@/types';

type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const PREF_KEY = 'sv_theme';

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === 'LIGHT') return 'light';
  if (pref === 'DARK') return 'dark';

  // AUTO: check IST time (UTC+5:30)
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + 5.5 * 3600000;
  const ist = new Date(istMs);
  const hour = ist.getHours();
  const minute = ist.getMinutes();
  const totalMinutes = hour * 60 + minute;
  // 10:00–12:00 IST → light
  if (totalMinutes >= 600 && totalMinutes < 720) return 'light';
  return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('AUTO');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');

  // Load saved preference
  useEffect(() => {
    const saved = (localStorage.getItem(PREF_KEY) as ThemePreference) || 'AUTO';
    setPreferenceState(saved);
    const resolved = resolveTheme(saved);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Re-evaluate AUTO theme every minute
  useEffect(() => {
    if (preference !== 'AUTO') return;
    const interval = setInterval(() => {
      const resolved = resolveTheme('AUTO');
      setResolvedTheme(resolved);
      applyTheme(resolved);
    }, 60000);
    return () => clearInterval(interval);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    localStorage.setItem(PREF_KEY, pref);
    const resolved = resolveTheme(pref);
    setResolvedTheme(resolved);
    applyTheme(resolved);

    // Save to user profile in backend if logged in
    const token = typeof window !== 'undefined' ? (localStorage.getItem('sv_token') ?? localStorage.getItem('token')) : null;
    if (token) {
      import('@/lib/themeApi').then(({ saveThemePreference }) => {
        saveThemePreference(pref).catch(() => {});
      });
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyTheme(theme: ResolvedTheme) {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
