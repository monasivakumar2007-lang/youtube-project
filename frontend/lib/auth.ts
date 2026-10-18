// ============================================================
// lib/auth.ts
// Auth helper utilities — token storage, user session
// ============================================================

import { api } from './api';
import type { User } from '@/types';

const TOKEN_KEY = 'sv_token';
const USER_KEY  = 'sv_user';

// ─── Token Helpers ───────────────────────────────────────────

export function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

// ─── User Session Helpers ────────────────────────────────────

export function saveUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getSavedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

// ─── API Calls ───────────────────────────────────────────────

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  requiresOtp?: boolean;
  purpose?: string;
  email?: string;
  token?: string;
  user?: User;
  devOtp?: string;
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResult> {
  const res = await api.post<AuthResult>('/api/auth/register', payload);
  return res as AuthResult;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResult> {
  const res = await api.post<AuthResult>('/api/auth/login', payload);
  return res as AuthResult;
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<AuthResult> {
  const res = await api.post<AuthResult>('/api/auth/verify-otp', payload);
  return res as AuthResult;
}

export async function resendOtp(email: string): Promise<{ success: boolean; message?: string; devOtp?: string }> {
  const res = await api.post<{ success: boolean; message?: string; devOtp?: string }>('/api/auth/resend-otp', { email });
  return res as { success: boolean; message?: string; devOtp?: string };
}

export async function getMe(): Promise<{ success: boolean; user?: User; message?: string }> {
  const res = await api.get<{ user: User }>('/api/auth/me');
  if (res.success && res.data?.user) {
    return { success: true, user: res.data.user };
  }
  return { success: false, message: res.message };
}

export async function logoutUser(): Promise<void> {
  await api.post('/api/auth/logout', {});
  removeToken();
}
