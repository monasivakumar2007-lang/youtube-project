// ============================================================
// src/routes/comment.routes.ts
// Comment & Moderation Routes — Task 6
// ============================================================

import { Router } from 'express';
import * as commentController from '../controllers/comment.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router({ mergeParams: true });

// Video comment threads
router.get('/:videoId/comments', commentController.listComments);
router.post('/:videoId/comments', authenticate, commentController.createComment);

// Comment actions
router.post('/comments/:id/translate', commentController.translateComment);
router.post('/comments/:id/like', commentController.likeComment);
router.post('/comments/:id/dislike', commentController.dislikeComment);
router.post('/comments/:id/report', authenticate, commentController.reportComment);

export default router;
