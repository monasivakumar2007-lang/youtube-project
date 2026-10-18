// ============================================================
// lib/subscriptionApi.ts
// Subscription & Razorpay Payment API — Task 3
// ============================================================

import { api } from './api';
import type { ApiResponse, User } from '@/types';

export interface PlanItem {
  id: 'FREE' | 'BRONZE' | 'SILVER' | 'GOLD';
  name: string;
  tagline: string;
  price: number;
  amountInPaise: number;
  durationDays: number;
  features: string[];
  downloadsPerDay: string;
  streamingQuality: string;
  watchPartyLimit: string;
  hasAdFree: boolean;
  hasRecording: boolean;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  planName: string;
  planPrice: number;
  subscriptionId: string;
}

export interface InvoiceDetails {
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  planTier: string;
  billingCycle: string;
  subtotal: string;
  tax: string;
  totalAmount: string;
  paymentId: string;
  orderId: string;
  paymentMethod: string;
  status: string;
  validUntil: string;
}

export interface VerifyPaymentResponse {
  user: User;
  subscription: any;
  invoice: InvoiceDetails;
}

export const DEFAULT_PLANS: PlanItem[] = [
  {
    id: 'FREE',
    name: 'Free',
    tagline: 'Basic access to video streaming catalog',
    price: 0,
    amountInPaise: 0,
    durationDays: 365,
    features: [
      '1 Video Download per 24 hours',
      'Standard 720p HD Streaming',
      'Community Live Chat & Comments',
      'Join Watch Parties (up to 2 participants)',
    ],
    downloadsPerDay: '1 / day',
    streamingQuality: '720p HD',
    watchPartyLimit: 'Up to 2 friends',
    hasAdFree: false,
    hasRecording: false,
  },
  {
    id: 'BRONZE',
    name: 'Bronze',
    tagline: 'Ideal for frequent movie and series viewers',
    price: 99,
    amountInPaise: 9900,
    durationDays: 30,
    features: [
      '5 Video Downloads per 24 hours',
      'Full HD 1080p Streaming Quality',
      'Ad-Free viewing experience',
      'Host Watch Parties with up to 5 friends',
    ],
    downloadsPerDay: '5 / day',
    streamingQuality: '1080p Full HD',
    watchPartyLimit: 'Up to 5 friends',
    hasAdFree: true,
    hasRecording: false,
  },
  {
    id: 'SILVER',
    name: 'Silver',
    tagline: 'Best for movie buffs and power streamers',
    price: 299,
    amountInPaise: 29900,
    durationDays: 30,
    features: [
      '15 Video Downloads per 24 hours',
      'Ultra HD 2K Streaming Quality',
      'Priority Watch Party rooms (up to 15 friends)',
      'Host Session Recording (save webm locally)',
    ],
    downloadsPerDay: '15 / day',
    streamingQuality: '2K Ultra HD',
    watchPartyLimit: 'Up to 15 friends',
    hasAdFree: true,
    hasRecording: true,
  },
  {
    id: 'GOLD',
    name: 'Gold VIP',
    tagline: 'The ultimate streaming experience with zero limits',
    price: 599,
    amountInPaise: 59900,
    durationDays: 30,
    features: [
      'Unlimited Video Downloads (No daily limits)',
      'Pristine 4K HDR Streaming Quality',
      'Unlimited Watch Party rooms (up to 50 friends)',
      'Local Host Session Recording',
    ],
    downloadsPerDay: 'Unlimited',
    streamingQuality: '4K HDR Cinema',
    watchPartyLimit: 'Up to 50 friends',
    hasAdFree: true,
    hasRecording: true,
  },
];

export async function getSubscriptionPlans(): Promise<ApiResponse<PlanItem[]>> {
  try {
    const res = await api.get<PlanItem[]>('/api/subscriptions/plans');
    if (res.success && res.data && res.data.length > 0) return res;
  } catch {}
  return {
    success: true,
    data: DEFAULT_PLANS,
  };
}

export async function createSubscriptionOrder(planType: string): Promise<ApiResponse<CreateOrderResponse>> {
  return api.post<CreateOrderResponse>('/api/subscriptions/create-order', { planType });
}

export async function verifySubscriptionPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
  planType: string;
}): Promise<ApiResponse<VerifyPaymentResponse>> {
  return api.post<VerifyPaymentResponse>('/api/subscriptions/verify-payment', payload);
}

export async function getSubscriptionHistory(): Promise<ApiResponse<any[]>> {
  return api.get<any[]>('/api/subscriptions/history');
}
