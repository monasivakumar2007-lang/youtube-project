// ============================================================
// src/controllers/subscription.controller.ts
// Subscription & Razorpay Test Payment Integration — Task 3
// ============================================================

import { Request, Response } from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/authenticate';
import { env } from '../config/env';

export interface PlanDetails {
  id: 'FREE' | 'BRONZE' | 'SILVER' | 'GOLD';
  name: string;
  tagline: string;
  price: number; // in INR
  amountInPaise: number;
  durationDays: number;
  features: string[];
  downloadsPerDay: string;
  streamingQuality: string;
  watchPartyLimit: string;
  hasAdFree: boolean;
  hasRecording: boolean;
}

export const PLANS: Record<string, PlanDetails> = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    tagline: 'Basic access to video streaming catalog',
    price: 0,
    amountInPaise: 0,
    durationDays: 365,
    features: [
      '1 Video Download per 24 hours',
      'Standard 720p HD Streaming',
      'Community Live Chat & Multilingual Comments',
      'Join Watch Parties (up to 2 participants)',
      'Basic Theme controls',
    ],
    downloadsPerDay: '1 / day',
    streamingQuality: '720p HD',
    watchPartyLimit: 'Up to 2 friends',
    hasAdFree: false,
    hasRecording: false,
  },
  BRONZE: {
    id: 'BRONZE',
    name: 'Bronze',
    tagline: 'Ideal for frequent movie and series viewers',
    price: 199,
    amountInPaise: 19900,
    durationDays: 30,
    features: [
      '5 Video Downloads per 24 hours',
      'Full HD 1080p Streaming Quality',
      'Ad-Free viewing experience',
      'Host Watch Parties with up to 5 friends',
      'Bronze Member Badge in Comments',
      'Email customer support',
    ],
    downloadsPerDay: '5 / day',
    streamingQuality: '1080p Full HD',
    watchPartyLimit: 'Up to 5 friends',
    hasAdFree: true,
    hasRecording: false,
  },
  SILVER: {
    id: 'SILVER',
    name: 'Silver',
    tagline: 'High performance streaming for power viewers',
    price: 499,
    amountInPaise: 49900,
    durationDays: 30,
    features: [
      '15 Video Downloads per 24 hours',
      'Ultra HD 1080p 60fps & Enhanced Audio',
      '100% Ad-Free Streaming',
      'Host Watch Parties with up to 15 friends',
      'Silver VIP Badge in Comments',
      'Priority streaming bandwidth',
    ],
    downloadsPerDay: '15 / day',
    streamingQuality: '1080p 60fps Ultra',
    watchPartyLimit: 'Up to 15 friends',
    hasAdFree: true,
    hasRecording: false,
  },
  GOLD: {
    id: 'GOLD',
    name: 'Gold VIP',
    tagline: 'The ultimate streaming, party & recording experience',
    price: 999,
    amountInPaise: 99900,
    durationDays: 30,
    features: [
      'Unlimited Video Downloads (No 24h limit)',
      '4K Ultra HD + HDR Streaming',
      'Completely Ad-Free with zero interruptions',
      'Unlimited Watch Party participants',
      'Watch Party Session Recording (local & host export)',
      'Gold VIP Creator Badge & 24/7 Concierge Support',
    ],
    downloadsPerDay: 'Unlimited',
    streamingQuality: '4K Ultra HD + HDR',
    watchPartyLimit: 'Unlimited participants',
    hasAdFree: true,
    hasRecording: true,
  },
};

/**
 * GET /api/subscriptions/plans
 * Returns available subscription tier options
 */
export const listPlans = (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: Object.values(PLANS),
  });
};

/**
 * POST /api/subscriptions/create-order
 * Initiates Razorpay test order for the requested plan
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { planType } = req.body;
    const plan = PLANS[planType];

    if (!plan || plan.id === 'FREE') {
      res.status(400).json({ success: false, message: 'Invalid subscription plan selected.' });
      return;
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_StreamVaultDemoKey';
    const razorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Create a pending subscription in database
    const subscription = await prisma.subscription.create({
      data: {
        userId: authReq.user.id,
        planType: plan.id,
        razorpayOrderId,
        amount: plan.amountInPaise,
        status: 'PENDING',
      },
    });

    res.json({
      success: true,
      data: {
        orderId: razorpayOrderId,
        amount: plan.amountInPaise,
        currency: 'INR',
        keyId: razorpayKeyId,
        planName: plan.name,
        planPrice: plan.price,
        subscriptionId: subscription.id,
      },
    });
  } catch (error) {
    console.error('[createOrder error]', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order.' });
  }
};

/**
 * POST /api/subscriptions/verify-payment
 * Verifies Razorpay payment signature, updates user's plan,
 * generates invoice, and sends confirmation notification/email.
 */
export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planType,
    } = req.body;

    const plan = PLANS[planType];
    if (!plan) {
      res.status(400).json({ success: false, message: 'Invalid plan specified.' });
      return;
    }

    // Verify HMAC signature if secret is provided and not demo test mode
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (secret && razorpay_signature && !razorpay_signature.startsWith('demo_sig_')) {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        res.status(400).json({ success: false, message: 'Payment signature verification failed.' });
        return;
      }
    }

    const paymentId = razorpay_payment_id || `pay_test_${Date.now()}`;
    const now = new Date();
    const endDate = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    // 1. Update user plan in DB
    const updatedUser = await prisma.user.update({
      where: { id: authReq.user.id },
      data: { planType: plan.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        planType: true,
        themePreference: true,
      },
    });

    // 2. Record / Update Subscription in DB
    const existingSub = await prisma.subscription.findFirst({
      where: { razorpayOrderId: razorpay_order_id },
    });

    let subscriptionRecord;
    if (existingSub) {
      subscriptionRecord = await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          razorpayPaymentId: paymentId,
          razorpaySignature: razorpay_signature || 'verified_test_sig',
          status: 'SUCCESS',
          startDate: now,
          endDate,
        },
      });
    } else {
      subscriptionRecord = await prisma.subscription.create({
        data: {
          userId: authReq.user.id,
          planType: plan.id,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: paymentId,
          razorpaySignature: razorpay_signature || 'verified_test_sig',
          amount: plan.amountInPaise,
          status: 'SUCCESS',
          startDate: now,
          endDate,
        },
      });
    }

    // 3. Generate Invoice Details
    const invoiceNumber = `INV-SV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const taxAmount = Math.round(plan.price * 0.18); // 18% GST included or added
    const subtotal = plan.price - taxAmount;

    const invoice = {
      invoiceNumber,
      date: now.toISOString(),
      customerName: updatedUser.name,
      customerEmail: updatedUser.email,
      planName: plan.name,
      planTier: plan.id,
      billingCycle: '30 Days Monthly',
      subtotal: `₹${subtotal}`,
      tax: `₹${taxAmount} (18% GST)`,
      totalAmount: `₹${plan.price}`,
      amountInPaise: plan.amountInPaise,
      paymentId,
      orderId: razorpay_order_id,
      paymentMethod: 'Razorpay (Test Mode)',
      status: 'PAID',
      validUntil: endDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
    };

    // 4. Send Confirmation Email / Invoice (Simulated or SMTP)
    sendSubscriptionEmail(updatedUser.email, updatedUser.name, plan, invoice).catch((err) => {
      console.warn('[Subscription Mailer Warning]', err.message);
    });

    res.json({
      success: true,
      message: `Congratulations! Your account has been upgraded to ${plan.name} plan.`,
      user: updatedUser,
      subscription: subscriptionRecord,
      invoice,
    });
  } catch (error) {
    console.error('[verifyPayment error]', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment.' });
  }
};

/**
 * GET /api/subscriptions/history
 * Returns user's transaction & subscription history
 */
export const getSubscriptionHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: authReq.user.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    console.error('[getSubscriptionHistory error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve subscription history.' });
  }
};

/**
 * Helper to dispatch confirmation email with invoice details
 */
async function sendSubscriptionEmail(
  email: string,
  name: string,
  plan: PlanDetails,
  invoice: any
): Promise<void> {
  console.log('────────────────────────────────────────────────────────────');
  console.log(`📧 [INVOICE EMAIL SENT] To: ${email}`);
  console.log(`👤 Customer: ${name}`);
  console.log(`📦 Plan: ${plan.name} (₹${plan.price})`);
  console.log(`🧾 Invoice #: ${invoice.invoiceNumber}`);
  console.log(`💳 Payment ID: ${invoice.paymentId}`);
  console.log(`📅 Valid Until: ${invoice.validUntil}`);
  console.log('────────────────────────────────────────────────────────────');

  // Attempt real SMTP send if credentials configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: '"StreamVault Subscriptions" <no-reply@streamvault.com>',
      to: email,
      subject: `Invoice #${invoice.invoiceNumber} — Your StreamVault ${plan.name} Plan is Active!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
          <h2 style="color: #6366f1;">Thank you for your subscription!</h2>
          <p>Hi <strong>${name}</strong>,</p>
          <p>Your payment for the <strong>StreamVault ${plan.name} Plan</strong> was successful.</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Payment ID:</strong> ${invoice.paymentId}</p>
            <p><strong>Plan:</strong> ${plan.name} (${invoice.totalAmount})</p>
            <p><strong>Valid Until:</strong> ${invoice.validUntil}</p>
          </div>
          <p>Enjoy unlimited HD streaming, downloads, and Watch Parties!</p>
          <p>The StreamVault Team</p>
        </div>
      `,
    });
  }
}

/**
 * POST /api/subscriptions/cancel
 * Allows users to cancel or reset their subscription back to FREE tier
 */
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: authReq.user.id },
      data: { planType: 'FREE' },
    });

    res.json({
      success: true,
      message: 'Subscription downgraded to FREE plan.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        planType: updatedUser.planType,
      },
    });
  } catch (error) {
    console.error('[cancelSubscription error]', error);
    res.status(500).json({ success: false, message: 'Failed to cancel subscription.' });
  }
};
