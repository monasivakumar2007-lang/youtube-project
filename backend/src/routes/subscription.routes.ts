// ============================================================
// src/routes/subscription.routes.ts
// Subscription & Razorpay Test Payment Routes — Task 3
// ============================================================

import { Router } from 'express';
import * as subscriptionController from '../controllers/subscription.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/plans', subscriptionController.listPlans);
router.post('/create-order', authenticate, subscriptionController.createOrder);
router.post('/verify-payment', authenticate, subscriptionController.verifyPayment);
router.post('/cancel', authenticate, subscriptionController.cancelSubscription);
router.get('/history', authenticate, subscriptionController.getSubscriptionHistory);

export default router;
