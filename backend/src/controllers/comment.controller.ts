// ============================================================
// src/controllers/comment.controller.ts
// Multilingual Comments & Moderation Controller
// ============================================================

import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { moderateCommentText } from '../utils/moderation';
import { translateText } from '../utils/translation';
import { extractClientDeviceInfo } from '../utils/deviceDetector';

/**
 * GET /api/videos/:videoId/comments
 * Retrieve all comments for a specific video
 */
export const listComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;

    const comments = await prisma.comment.findMany({
      where: { videoId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            planType: true,
            role: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: comments,
      count: comments.length,
    });
  } catch (error) {
    console.error('[listComments error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve comments.' });
  }
};

/**
 * POST /api/videos/:videoId/comments
 * Post a new comment with content moderation (blocks abusive, spam, and repeated special characters)
 */
export const createComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: 'You must be signed in to post a comment.' });
      return;
    }

    const { videoId } = req.params;
    const { text, shareLocation } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Comment text is required.' });
      return;
    }

    // ─── Task 6 Moderation Check ───────────────────────────────
    const modResult = moderateCommentText(text);
    if (modResult.isBlocked) {
      res.status(400).json({
        success: false,
        message: modResult.message || 'Comment violates community safety guidelines.',
        reason: modResult.reason,
        matchedTerm: modResult.matchedTerm,
      });
      return;
    }

    // Optional location region display (privacy preserved — broad region only, never exact address)
    let locationRegion: string | null = null;
    if (shareLocation) {
      const clientInfo = extractClientDeviceInfo(req);
      if (clientInfo.state && clientInfo.state !== 'Unknown') {
        locationRegion = `${clientInfo.state}, ${clientInfo.country || 'India'}`;
      } else if (clientInfo.country && clientInfo.country !== 'Unknown') {
        locationRegion = clientInfo.country;
      } else {
        locationRegion = 'India';
      }
    }

    // Detect language
    const hasDevanagari = /[\u0900-\u097F]/.test(text);
    const language = hasDevanagari ? 'hi' : 'en';

    const newComment = await prisma.comment.create({
      data: {
        userId: authReq.user.id,
        videoId,
        text: text.trim(),
        language,
        locationRegion,
        isFlagged: false,
        reportStatus: 'NONE',
        likes: 0,
        dislikes: 0,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            planType: true,
            role: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: newComment,
      message: 'Comment posted successfully.',
    });
  } catch (error) {
    console.error('[createComment error]', error);
    res.status(500).json({ success: false, message: 'Failed to post comment.' });
  }
};

/**
 * POST /api/comments/:id/translate
 * Translate comment to user's preferred target language
 */
export const translateComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { targetLanguage = 'en' } = req.body;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      res.status(404).json({ success: false, message: 'Comment not found.' });
      return;
    }

    const { translatedText, sourceLang } = await translateText(comment.text, targetLanguage);

    res.json({
      success: true,
      data: {
        id: comment.id,
        originalText: comment.text,
        translatedText,
        sourceLanguage: sourceLang,
        targetLanguage,
      },
    });
  } catch (error) {
    console.error('[translateComment error]', error);
    res.status(500).json({ success: false, message: 'Failed to translate comment.' });
  }
};

/**
 * POST /api/comments/:id/like
 * Increment like count for a comment
 */
export const likeComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      res.status(404).json({ success: false, message: 'Comment not found.' });
      return;
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { likes: (comment.likes || 0) + 1 },
    });

    res.json({
      success: true,
      data: { likes: updated.likes, dislikes: updated.dislikes },
    });
  } catch (error) {
    console.error('[likeComment error]', error);
    res.status(500).json({ success: false, message: 'Failed to like comment.' });
  }
};

/**
 * POST /api/comments/:id/dislike
 * Increment dislike count for a comment
 * Note: Under Task 6 requirements, comments are NEVER automatically deleted after dislikes.
 */
export const dislikeComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      res.status(404).json({ success: false, message: 'Comment not found.' });
      return;
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { dislikes: (comment.dislikes || 0) + 1 },
    });

    res.json({
      success: true,
      data: { likes: updated.likes, dislikes: updated.dislikes },
    });
  } catch (error) {
    console.error('[dislikeComment error]', error);
    res.status(500).json({ success: false, message: 'Failed to dislike comment.' });
  }
};

/**
 * POST /api/comments/:id/report
 * User reports a comment for review
 * Moves comment to PENDING_REVIEW rather than auto-deleting it
 */
export const reportComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: 'Authentication required to report comments.' });
      return;
    }

    const { id } = req.params;
    const { reason = 'Inappropriate content' } = req.body;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      res.status(404).json({ success: false, message: 'Comment not found.' });
      return;
    }

    // Record report
    await prisma.commentReport.create({
      data: {
        commentId: id,
        userId: authReq.user.id,
        reason,
        status: 'PENDING_REVIEW',
      },
    }).catch(() => {});

    // Update comment status to PENDING_REVIEW and flag it
    const updated = await prisma.comment.update({
      where: { id },
      data: {
        isFlagged: true,
        reportStatus: 'PENDING_REVIEW',
        moderationReason: reason,
      },
    });

    res.json({
      success: true,
      message: 'Comment has been reported and flagged for moderator review.',
      data: updated,
    });
  } catch (error) {
    console.error('[reportComment error]', error);
    res.status(500).json({ success: false, message: 'Failed to report comment.' });
  }
};

/**
 * GET /api/admin/flagged-comments
 * Admin endpoint to list all flagged/reported comments
 */
export const listFlaggedComments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const comments = await prisma.comment.findMany({
      where: {
        reportStatus: 'PENDING_REVIEW',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        video: { select: { id: true, title: true } },
        reports: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      success: true,
      data: comments,
      count: comments.length,
    });
  } catch (error) {
    console.error('[listFlaggedComments error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve flagged comments.' });
  }
};
