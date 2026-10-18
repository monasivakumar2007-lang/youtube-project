// ============================================================
// src/controllers/admin.controller.ts
// Admin Controller
// ============================================================

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { prisma } from '../config/prisma';

/**
 * GET /api/admin/users
 * Returns a list of all registered users.
 * Strictly restricted to users with ADMIN role.
 */
export const listUsers = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        planType: true,
        themePreference: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.status(200).json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error('[ADMIN_LIST_USERS_ERROR]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
};
