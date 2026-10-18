// ============================================================
// src/utils/jwt.ts
// JWT token utilities — STUB (Phase 2)
// ============================================================

import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  id: string;
  userId?: string;
  email: string;
  role: string;
  planType: string;
}

/**
 * Sign an access token (default 7 days).
 */
export function signAccessToken(payload: JwtPayload): string {
  const normalizedPayload = {
    ...payload,
    userId: payload.userId || payload.id,
    id: payload.id || payload.userId,
  };
  return jwt.sign(normalizedPayload, env.jwtSecret, { expiresIn: env.jwtExpiry } as jwt.SignOptions);
}

/**
 * Sign a long-lived refresh token (default 7 days).
 */
export function signRefreshToken(payload: Pick<JwtPayload, 'id'>): string {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiry } as jwt.SignOptions);
}

/**
 * Verify and decode an access token.
 * Throws if invalid or expired.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}

/**
 * Verify and decode a refresh token.
 */
export function verifyRefreshToken(token: string): Pick<JwtPayload, 'id'> {
  return jwt.verify(token, env.jwtRefreshSecret) as Pick<JwtPayload, 'id'>;
}
