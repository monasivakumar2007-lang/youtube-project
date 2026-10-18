// ============================================================
// src/middleware/rateLimiter.ts
// Rate Limiters for Authentication and Sensitive Endpoints
// ============================================================

import rateLimit from 'express-rate-limit';

/**
 * Authentication rate limiter:
 * Limits login, registration, and OTP verification requests
 * to prevent brute-force attacks and abuse.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 minutes per IP (development friendly)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait a few minutes and try again.',
  },
});

/**
 * Stricter rate limiter specifically for resending OTPs
 */
export const otpResendLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // max 5 resend requests per 5 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait before requesting another code.',
  },
});
