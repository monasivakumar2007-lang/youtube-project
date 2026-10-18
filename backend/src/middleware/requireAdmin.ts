// ============================================================
// src/middleware/requireAdmin.ts
// Role Guard Middleware (RBAC)
// ============================================================
// Must be used AFTER authenticate middleware.
// Checks req.user.role against required role.
// Returns 403 Forbidden if the user does not have permission.
// ============================================================

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';

/**
 * Reusable role guard middleware generator.
 * Example: requireRole('ADMIN')
 */
export const requireRole = (allowedRole: 'ADMIN' | 'USER') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    if (req.user.role !== allowedRole) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to access this resource.',
      });
      return;
    }

    next();
  };
};

/**
 * Convenience middleware to require ADMIN role
 */
export const requireAdmin = requireRole('ADMIN');
