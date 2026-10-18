// ============================================================
// lib/theme.ts
// Theme Utility — AUTO / LIGHT / DARK logic
// ============================================================
// AUTO mode rules (IST = UTC+5:30):
//   10:00 AM – 12:00 PM IST → LIGHT
//   All other times          → DARK
//
// The resolved theme is applied by setting/removing the 'dark'
// class on the <html> element.  ThemeProvider (Phase 2) will
// call applyTheme() on mount and when the user changes their
// preference.
// ============================================================

import type { ThemePreference } from '@/types';

/**
 * Determine whether AUTO mode resolves to 'light' or 'dark'
 * based on the current IST time.
 */
export function resolveAutoTheme(): 'light' | 'dark' {
  const now = new Date();

  // Get hours and minutes in IST (UTC+5:30)
  const istOffset = 5.5 * 60; // minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = (utcMinutes + istOffset) % (24 * 60);
  const istHour = Math.floor(istMinutes / 60);
  const istMin = istMinutes % 60;

  // LIGHT window: 10:00 AM – 12:00 PM IST
  const afterTen = istHour > 10 || (istHour === 10 && istMin >= 0);
  const beforeNoon = istHour < 12;

  return afterTen && beforeNoon ? 'light' : 'dark';
}

/**
 * Apply the correct Tailwind dark class to <html> based on
 * the user's stored ThemePreference.
 */
export function applyTheme(preference: ThemePreference): void {
  const html = document.documentElement;
  const resolved = preference === 'AUTO' ? resolveAutoTheme() : preference.toLowerCase() as 'light' | 'dark';

  if (resolved === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}
