// ============================================================
// src/routes/download.routes.ts
// Download Routes — Task 2
// ============================================================

import { Router } from 'express';
import * as downloadController from '../controllers/download.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/', authenticate, downloadController.listDownloads);
router.post('/:videoId', authenticate, downloadController.createDownload);

export default router;
