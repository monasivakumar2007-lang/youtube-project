// ============================================================
// src/routes/watchParty.routes.ts
// Watch Party Routes — Task 1
// ============================================================

import { Router } from 'express';
import * as watchPartyController from '../controllers/watchParty.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/', authenticate, watchPartyController.createParty);
router.get('/:roomId', watchPartyController.getParty);
router.post('/:roomId/end', authenticate, watchPartyController.endParty);

export default router;
