// ============================================================
// src/controllers/download.controller.ts  — STUB (Phase 2)
// src/controllers/subscription.controller.ts — STUB (Phase N)
// src/controllers/comment.controller.ts  — STUB (Phase 2)
// src/controllers/admin.controller.ts    — STUB (Phase 2)
// src/controllers/watchParty.controller.ts — STUB (Phase N)
// ============================================================

import { Request, Response } from 'express';

const notImpl = (_req: Request, res: Response): void => {
  res.status(501).json({ success: false, message: 'Not implemented yet.' });
};

// ─── Download ────────────────────────────────────────────────
export const downloadController = {
  listDownloads: notImpl,
  createDownload: notImpl,
};

// ─── Subscription ────────────────────────────────────────────
export const subscriptionController = {
  listPlans: notImpl,
  createOrder: notImpl,
  verifyPayment: notImpl,
};

// ─── Comment ─────────────────────────────────────────────────
export const commentController = {
  listComments: notImpl,
  createComment: notImpl,
  translateComment: notImpl,
  likeComment: notImpl,
  dislikeComment: notImpl,
  reportComment: notImpl,
};

// ─── Admin ───────────────────────────────────────────────────
export const adminController = {
  listReported: notImpl,
  reviewComment: notImpl,
};

// ─── Watch Party ─────────────────────────────────────────────
export const watchPartyController = {
  createParty: notImpl,
  getParty: notImpl,
};
