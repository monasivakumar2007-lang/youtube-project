// ============================================================
// lib/themeApi.ts
// Theme & Profile preference API — Task 5
// ============================================================

import { api } from './api';
import type { ApiResponse, ThemePreference } from '@/types';

export async function saveThemePreference(themePreference: ThemePreference): Promise<ApiResponse<any>> {
  return api.put<any>('/api/auth/theme', { themePreference });
}

export async function getLoginHistory(): Promise<ApiResponse<any[]>> {
  return api.get<any[]>('/api/auth/login-history');
}
