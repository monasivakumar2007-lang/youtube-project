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

export async function getSubscriptionPlans(): Promise<ApiResponse<PlanItem[]>> {
  return api.get<PlanItem[]>('/api/subscriptions/plans');
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
