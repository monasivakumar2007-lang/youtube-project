// ============================================================
// src/controllers/video.controller.ts
// Request handlers for Video Catalog, Streaming & Management
// ============================================================

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate';
import * as videoService from '../services/video.service';
import * as streamService from '../services/stream.service';

/**
 * GET /api/videos
 * Return paginated, searchable, category-filtered published videos.
 */
export const listVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, search, category, status } = req.query;
    const authReq = req as AuthenticatedRequest;
    const isAdmin = authReq.user?.role === 'ADMIN';

    const result = await videoService.listVideos({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 12,
      search: typeof search === 'string' ? search : undefined,
      category: typeof category === 'string' ? category : undefined,
      status: typeof status === 'string' ? status : undefined,
      includeUnpublished: isAdmin && req.query.includeUnpublished === 'true',
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[listVideos error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve videos.' });
  }
};

/**
 * GET /api/videos/:id
 * Retrieve details for a single video.
 */
export const getVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userRole = authReq.user?.role;
    const userId = authReq.user?.id;

    const video = await videoService.getVideoById(id, userRole, userId);

    if (!video) {
      res.status(404).json({ success: false, message: 'Video not found or unavailable.' });
      return;
    }

    res.json({
      success: true,
      data: video,
    });
  } catch (error) {
    console.error('[getVideo error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve video details.' });
  }
};

/**
 * GET /api/videos/:id/stream
 * HTTP Range-based streaming endpoint for authenticated users.
 */
export const streamVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userRole = authReq.user?.role;
    const userId = authReq.user?.id;

    const video = await videoService.getVideoById(id, userRole, userId);

    if (!video) {
      res.status(404).json({ success: false, message: 'Video not found or unavailable.' });
      return;
    }

    const safeFilePath = streamService.resolveSafeVideoPath(video.videoUrl);

    if (!safeFilePath) {
      if (video.videoUrl && (video.videoUrl.startsWith('http://') || video.videoUrl.startsWith('https://'))) {
        res.redirect(video.videoUrl);
        return;
      }
      res.status(404).json({ success: false, message: 'Video media file could not be located on server.' });
      return;
    }

    streamService.streamVideoFile(safeFilePath, req, res);
  } catch (error) {
    console.error('[streamVideo error]', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to stream video.' });
    }
  }
};

/**
 * POST /api/videos/:id/view
 * Record a valid view for a video.
 */
export const recordView = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await videoService.incrementVideoViews(id);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[recordView error]', error);
    res.status(500).json({ success: false, message: 'Failed to record view count.' });
  }
};

/**
 * POST /api/videos
 * Upload a new video file and thumbnail (authenticated).
 */
export const createVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: 'Authentication required to upload videos.' });
      return;
    }

    const { title, description, category, duration, isPublished } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Video title is required.' });
      return;
    }

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Video category is required.' });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const videoFile = files?.['video']?.[0];
    const thumbFile = files?.['thumbnail']?.[0];

    // Check if video file was uploaded or provided via body
    let videoUrl = req.body.videoUrl;
    if (videoFile) {
      videoUrl = `/uploads/videos/${videoFile.filename}`;
    }

    if (!videoUrl) {
      res.status(400).json({ success: false, message: 'A valid video file (MP4/WebM) is required.' });
      return;
    }

    let thumbnailUrl = req.body.thumbnailUrl;
    if (thumbFile) {
      thumbnailUrl = `/uploads/thumbnails/${thumbFile.filename}`;
    } else if (!thumbnailUrl) {
      thumbnailUrl = '/placeholders/video-thumb-placeholder.png';
    }

    const created = await videoService.createVideo({
      title,
      description,
      category,
      duration: duration ? Number(duration) : 0,
      videoUrl,
      thumbnailUrl,
      isPublished: isPublished !== undefined ? isPublished === 'true' || isPublished === true : true,
      uploadedById: authReq.user.id,
    });

    res.status(201).json({
      success: true,
      data: created,
      message: 'Video uploaded and published successfully.',
    });
  } catch (error) {
    console.error('[createVideo error]', error);
    res.status(500).json({ success: false, message: 'Failed to upload video.' });
  }
};

/**
 * PUT /api/videos/:id
 * Update metadata for an existing video (admin or owner).
 */
export const updateVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const { title, description, category, isPublished } = req.body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const thumbFile = files?.['thumbnail']?.[0];

    let thumbnailUrl = req.body.thumbnailUrl;
    if (thumbFile) {
      thumbnailUrl = `/uploads/thumbnails/${thumbFile.filename}`;
    }

    const result = await videoService.updateVideo(
      id,
      {
        title,
        description,
        category,
        thumbnailUrl,
        isPublished: isPublished !== undefined ? isPublished === 'true' || isPublished === true : undefined,
      },
      authReq.user.role,
      authReq.user.id
    );

    if (result.notFound) {
      res.status(404).json({ success: false, message: 'Video not found.' });
      return;
    }

    if (result.forbidden) {
      res.status(403).json({ success: false, message: 'Forbidden: You cannot modify this video.' });
      return;
    }

    res.json({
      success: true,
      data: result.video,
      message: 'Video updated successfully.',
    });
  } catch (error) {
    console.error('[updateVideo error]', error);
    res.status(500).json({ success: false, message: 'Failed to update video.' });
  }
};

/**
 * DELETE /api/videos/:id
 * Delete a video and remove associated files (admin or owner).
 */
export const deleteVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;

    const result = await videoService.deleteVideo(id, authReq.user.role, authReq.user.id);

    if (result.notFound) {
      res.status(404).json({ success: false, message: 'Video not found.' });
      return;
    }

    if (result.forbidden) {
      res.status(403).json({ success: false, message: 'Forbidden: You cannot delete this video.' });
      return;
    }

    res.json({
      success: true,
      message: 'Video deleted successfully.',
    });
  } catch (error) {
    console.error('[deleteVideo error]', error);
    res.status(500).json({ success: false, message: 'Failed to delete video.' });
  }
};
