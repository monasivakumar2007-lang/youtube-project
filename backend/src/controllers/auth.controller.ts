// ============================================================
// src/controllers/auth.controller.ts
// Authentication Controller
// ============================================================

import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { extractClientDeviceInfo } from '../utils/deviceDetector';
import { AuthenticatedRequest } from '../middleware/authenticate';

/**
 * POST /api/auth/register
 * Creates a new user with hashed password and USER role.
 * Generates an OTP for email verification.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('[AUTH_REGISTER_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to process registration.' });
  }
};

/**
 * POST /api/auth/login
 * Verifies credentials, evaluates device and location.
 * Issues JWT directly if known, or returns requiresOtp=true if unfamiliar.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const clientInfo = extractClientDeviceInfo(req);

    const result = await authService.login({ email, password, clientInfo });
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('[AUTH_LOGIN_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to process login.' });
  }
};

/**
 * POST /api/auth/verify-otp
 * Validates the 6-digit OTP code against the stored hash.
 * Marks verified, records LoginHistory, and issues JWT access token.
 */
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    const clientInfo = extractClientDeviceInfo(req);

    const result = await authService.verifyOtp({ email, otp, clientInfo });
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('[AUTH_VERIFY_OTP_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP.' });
  }
};

/**
 * POST /api/auth/resend-otp
 * Generates and stores a new OTP challenge, enforcing a 60s cooldown.
 */
export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await authService.resendOtp(email);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('[AUTH_RESEND_OTP_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to resend OTP.' });
  }
};

/**
 * GET /api/auth/me
 * Returns current authenticated user session data.
 */
export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized.' });
      return;
    }

    const result = await authService.getCurrentUser(req.user.id);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('[AUTH_GET_ME_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve user profile.' });
  }
};

/**
 * PUT /api/auth/theme
 * Updates the user's theme preference in database (AUTO, LIGHT, DARK)
 */
export const updateTheme = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized.' });
      return;
    }

    const { themePreference } = req.body;
    if (!['AUTO', 'LIGHT', 'DARK'].includes(themePreference)) {
      res.status(400).json({ success: false, message: 'Invalid theme preference. Must be AUTO, LIGHT, or DARK.' });
      return;
    }

    const updated = await authService.updateThemePreference(req.user.id, themePreference);
    res.json({ success: true, data: updated, message: 'Theme preference saved to profile.' });
  } catch (error) {
    console.error('[AUTH_UPDATE_THEME_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to update theme preference.' });
  }
};

/**
 * GET /api/auth/login-history
 * Returns user's verified login history with devices and locations
 */
export const getLoginHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized.' });
      return;
    }

    const history = await authService.getUserLoginHistory(req.user.id);
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('[AUTH_GET_HISTORY_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve login history.' });
  }
};

/**
 * POST /api/auth/logout
 * Clears authentication session.
 */
export const logout = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    console.error('[AUTH_LOGOUT_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to log out.' });
  }
};

