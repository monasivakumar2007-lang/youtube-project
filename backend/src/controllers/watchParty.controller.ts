// ============================================================
// src/controllers/watchParty.controller.ts
// Watch Party Management Controller — Task 1
// ============================================================

import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authenticate';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `party-${code}`;
}

/**
 * POST /api/watch-party
 * Create a new watch party room for a video
 */
export const createParty = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: 'Authentication required to start a watch party.' });
      return;
    }

    const { videoId, recordingEnabled = true } = req.body;

    if (!videoId) {
      res.status(400).json({ success: false, message: 'Video ID is required.' });
      return;
    }

    // Verify video exists
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      res.status(404).json({ success: false, message: 'Video not found.' });
      return;
    }

    const roomId = generateRoomCode();

    const party = await prisma.watchParty.create({
      data: {
        hostId: authReq.user.id,
        roomId,
        videoId,
        recordingEnabled: Boolean(recordingEnabled),
        recordingStatus: 'IDLE',
      },
      include: {
        host: {
          select: { id: true, name: true, email: true },
        },
        video: true,
      },
    });

    // Add host as first participant
    await prisma.watchPartyParticipant.create({
      data: {
        partyId: party.id,
        userId: authReq.user.id,
        joinedAt: new Date(),
      },
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Watch party created successfully.',
      data: {
        party,
        roomId,
        joinUrl: `/watch-party/${roomId}`,
      },
    });
  } catch (error) {
    console.error('[createParty error]', error);
    res.status(500).json({ success: false, message: 'Failed to create watch party.' });
  }
};

/**
 * GET /api/watch-party/:roomId
 * Retrieve watch party room details, video, host, and participants
 */
export const getParty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;

    const party = await prisma.watchParty.findFirst({
      where: { roomId },
      include: {
        host: {
          select: { id: true, name: true, email: true, planType: true },
        },
        video: true,
        participants: {
          where: { leftAt: null },
        },
      },
    });

    if (!party) {
      res.status(404).json({ success: false, message: 'Watch party room not found or has ended.' });
      return;
    }

    res.json({
      success: true,
      data: party,
    });
  } catch (error) {
    console.error('[getParty error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve watch party details.' });
  }
};

/**
 * POST /api/watch-party/:roomId/end
 * End watch party session (Host only)
 */
export const endParty = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { roomId } = req.params;

    const party = await prisma.watchParty.findFirst({ where: { roomId } });
    if (!party) {
      res.status(404).json({ success: false, message: 'Watch party not found.' });
      return;
    }

    if (party.hostId !== authReq.user.id && authReq.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Only the host can end this watch party.' });
      return;
    }

    await prisma.watchParty.update({
      where: { id: party.id },
      data: { endedAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Watch party ended successfully.',
    });
  } catch (error) {
    console.error('[endParty error]', error);
    res.status(500).json({ success: false, message: 'Failed to end watch party.' });
  }
};
