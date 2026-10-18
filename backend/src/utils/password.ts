// ============================================================
// src/utils/password.ts
// Password validation and bcrypt hashing utilities
// ============================================================

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Validate password requirements:
 * - Minimum 8 characters
 * - At least one letter (a-z, A-Z)
 * - At least one number (0-9)
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      message: 'Password is required.',
    };
  }

  if (password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters and contain a letter and a number.',
    };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters and contain a letter and a number.',
    };
  }

  return { valid: true };
}

/**
 * Hash a plain-text password using bcrypt.
 * Never store passwords in plain text.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compare a plain-text password with a bcrypt hash.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
