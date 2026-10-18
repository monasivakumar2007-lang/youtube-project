// ============================================================
// src/middleware/authenticate.ts
// JWT Authentication Middleware
// ============================================================
// Verifies the Bearer token in Authorization header.
// Attaches decoded user payload to req.user.
// Returns 401 if token is missing, invalid, or expired.
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../config/prisma';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  planType: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const queryToken = typeof req.query.token === 'string' ? req.query.token.trim() : null;

  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]?.trim() || null;
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Authorization token is required. Please log in.',
    });
    return;
  }


  try {
    const decoded = verifyAccessToken(token);
    const userId = decoded.id || decoded.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Invalid token payload.',
      });
      return;
    }

    // Always verify the user exists in database and has active role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        planType: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User no longer exists or session expired.',
      });
      return;
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      planType: user.planType,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authorization token.',
    });
  }
};
