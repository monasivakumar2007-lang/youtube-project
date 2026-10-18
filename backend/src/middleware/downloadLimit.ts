// ============================================================
// src/middleware/downloadLimit.ts
// Download Plan Limit Middleware — STUB (Phase 2)
// ============================================================
// Enforces per-plan download quotas within a 24-hour window.
//
// Limits (rolling 24 h):
//   FREE   →  1 download
//   BRONZE →  5 downloads
//   SILVER → 15 downloads
//   GOLD   → unlimited
//
// Implementation plan:
//   1. Read req.user.planType and req.user.id
//   2. Count rows in Download table WHERE userId = req.user.id
//      AND downloadedAt >= NOW() - INTERVAL '24 hours'
//   3. Compare count against plan limit
//   4. If limit reached → 429 Too Many Requests
//   5. Otherwise → next()
// ============================================================

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';

export const downloadLimitMiddleware = (
  _req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  // TODO Phase 2: implement quota check
  next();
};
