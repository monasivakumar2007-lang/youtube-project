// ============================================================
// src/routes/admin.routes.ts
// Admin Routes (Role-Based Access Control)
// ============================================================
// All admin routes require Role = ADMIN
// ============================================================

import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// GET /api/admin/users — List all registered users (ADMIN only)
router.get('/users', authenticate, requireAdmin, adminController.listUsers);

export default router;
