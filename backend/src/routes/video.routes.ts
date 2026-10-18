// ============================================================
// src/routes/video.routes.ts
// Video Catalog, Streaming & Management Routes (Phase 3)
// ============================================================

import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { uploadVideoFiles } from '../middleware/upload';
import * as videoController from '../controllers/video.controller';

const router = Router();

// ─── Public / Catalog Routes ─────────────────────────────────

// GET /api/videos — Paginated video catalog with search and category filtering
router.get('/', videoController.listVideos);

// GET /api/videos/:id — Video details with safe uploader info
router.get('/:id', videoController.getVideo);

// POST /api/videos/:id/view — Increment view counter
router.post('/:id/view', videoController.recordView);

// ─── Protected Video Streaming ───────────────────────────────

// GET /api/videos/:id/stream — HTTP 206 Range video stream (JWT authenticated)
router.get('/:id/stream', authenticate, videoController.streamVideo);

// ─── Protected Management & Upload Routes ─────────────────────

// POST /api/videos — Upload new video and thumbnail (authenticated)
router.post('/', authenticate, uploadVideoFiles, videoController.createVideo);

// PUT /api/videos/:id — Update video metadata or thumbnail (admin or owner)
router.put('/:id', authenticate, uploadVideoFiles, videoController.updateVideo);

// DELETE /api/videos/:id — Delete video and cleanup files (admin or owner)
router.delete('/:id', authenticate, videoController.deleteVideo);

export default router;
