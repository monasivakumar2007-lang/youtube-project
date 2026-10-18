// ============================================================
// src/utils/otp.ts
// OTP Generation, Hashing, Expiry, and Dev Logging
// ============================================================

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';

const OTP_SALT_ROUNDS = 10;

/**
 * Generate a cryptographically random 6-digit OTP.
 * Uses crypto.randomInt for uniform distribution.
 */
export function generateOtp(): string {
  const otp = crypto.randomInt(100_000, 999_999);
  return otp.toString();
}

/**
 * Hash an OTP using bcrypt before storing in the database.
 * Plain-text OTPs must NEVER be persisted.
 */
export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, OTP_SALT_ROUNDS);
}

/**
 * Compare user-entered OTP with stored bcrypt hash.
 */
export async function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

/**
 * Calculate the expiry timestamp for an OTP.
 * Default: 5 minutes (or configured via env.otpExpiryMinutes)
 */
export function getOtpExpiry(minutes: number = env.otpExpiryMinutes): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Check whether an OTP record has expired.
 */
export function isOtpExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

/**
 * Development OTP logger:
 * Prints generated OTP to the console only when OTP_DEV_MODE=true
 * and NODE_ENV !== 'production'.
 */
export function logDevOtp(email: string, otp: string, purpose: string = 'LOGIN'): void {
  if (env.otpDevMode && env.nodeEnv !== 'production') {
    console.log('==================================================');
    console.log('[DEV OTP]');
    console.log(`Email:   ${email}`);
    console.log(`OTP:     ${otp}`);
    console.log(`Purpose: ${purpose}`);
    console.log(`Expires: ${env.otpExpiryMinutes} minutes`);
    console.log('==================================================');
  }
}
