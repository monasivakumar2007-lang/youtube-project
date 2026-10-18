// ============================================================
// src/controllers/download.controller.ts
// Controlled Video Download Controller — Task 2
// ============================================================

import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authenticate';

// Daily download quotas by subscription plan tier
export const PLAN_DOWNLOAD_LIMITS: Record<string, number> = {
  FREE: 1,
  BRONZE: 5,
  SILVER: 15,
  GOLD: 999999, // Unlimited
};

/**
 * GET /api/downloads
 * Returns list of videos downloaded by the authenticated user and their current quota status
 */
export const listDownloads = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const userId = authReq.user.id;
    const plan = authReq.user.planType || 'FREE';
    const dailyLimit = PLAN_DOWNLOAD_LIMITS[plan] ?? 1;

    // Get downloads within the last 24 hours
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const downloads24hCount = await prisma.download.count({
      where: {
        userId,
        downloadedAt: { gte: last24h },
      },
    });

    // Get all user downloads with video details
    const downloads = await prisma.download.findMany({
      where: { userId },
      orderBy: { downloadedAt: 'desc' },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            videoUrl: true,
            duration: true,
            category: true,
          },
        },
      },
    });

    const remainingToday = Math.max(0, dailyLimit - downloads24hCount);

    res.json({
      success: true,
      data: {
        downloads,
        quota: {
          plan,
          dailyLimit: plan === 'GOLD' ? 'Unlimited' : dailyLimit,
          usedToday: downloads24hCount,
          remainingToday: plan === 'GOLD' ? 'Unlimited' : remainingToday,
          canDownload: plan === 'GOLD' || remainingToday > 0,
        },
      },
    });
  } catch (error) {
    console.error('[listDownloads error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve download history.' });
  }
};

/**
 * POST /api/downloads/:videoId
 * Validates plan limits, records download, and serves the video download URL
 */
export const createDownload = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: 'Authentication required to download videos.' });
      return;
    }

    const { videoId } = req.params;
    const userId = authReq.user.id;
    const plan = authReq.user.planType || 'FREE';
    const dailyLimit = PLAN_DOWNLOAD_LIMITS[plan] ?? 1;

    // Check if video exists
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      res.status(404).json({ success: false, message: 'Video not found.' });
      return;
    }

    // ─── Task 2: Quota Enforcement ─────────────────────────────
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const downloads24hCount = await prisma.download.count({
      where: {
        userId,
        downloadedAt: { gte: last24h },
      },
    });

    if (plan !== 'GOLD' && downloads24hCount >= dailyLimit) {
      res.status(403).json({
        success: false,
        limitReached: true,
        message: `Daily download limit reached for ${plan} plan (${downloads24hCount}/${dailyLimit} used in the last 24 hours). Please upgrade your subscription to download more videos.`,
        plan,
        dailyLimit,
        usedToday: downloads24hCount,
      });
      return;
    }

    // Record the download transaction
    const downloadRecord = await prisma.download.create({
      data: {
        userId,
        videoId,
        planType: plan,
        downloadedAt: new Date(),
      },
      include: {
        video: true,
      },
    });

    const newRemaining = plan === 'GOLD' ? 'Unlimited' : Math.max(0, dailyLimit - (downloads24hCount + 1));

    res.status(201).json({
      success: true,
      message: 'Download authorized successfully.',
      data: {
        download: downloadRecord,
        downloadUrl: video.videoUrl,
        quota: {
          plan,
          dailyLimit: plan === 'GOLD' ? 'Unlimited' : dailyLimit,
          usedToday: downloads24hCount + 1,
          remainingToday: newRemaining,
        },
      },
    });
  } catch (error) {
    console.error('[createDownload error]', error);
    res.status(500).json({ success: false, message: 'Failed to initiate video download.' });
  }
};
