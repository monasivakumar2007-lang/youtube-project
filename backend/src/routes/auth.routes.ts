// ============================================================
// src/routes/auth.routes.ts
// Authentication Routes
// ============================================================

import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { authRateLimiter, otpResendLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public auth endpoints with rate limiting
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/verify-otp', authRateLimiter, authController.verifyOtp);
router.post('/resend-otp', otpResendLimiter, authController.resendOtp);
router.post('/logout', authController.logout);

// Protected session & preferences
router.get('/me', authenticate, authController.getMe);
router.put('/theme', authenticate, authController.updateTheme);
router.get('/login-history', authenticate, authController.getLoginHistory);

export default router;
