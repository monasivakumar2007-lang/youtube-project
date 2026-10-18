'use client';

// ============================================================
// components/subscription/SubscriptionModal.tsx
// Subscription Upgrade with Razorpay Test Mode & Invoice — Task 3
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  PlanItem,
  getSubscriptionPlans,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  InvoiceDetails,
} from '@/lib/subscriptionApi';
import Button from '@/components/ui/Button';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightPlan?: 'BRONZE' | 'SILVER' | 'GOLD';
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  highlightPlan,
}: SubscriptionModalProps) {
  const { user, login } = useAuth();

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>(highlightPlan || 'SILVER');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Invoice modal state
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);

  // Load Razorpay checkout.js script dynamically
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Fetch plans
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    getSubscriptionPlans()
      .then((res) => {
        if (res.success && res.data) {
          setPlans(res.data);
        }
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleUpgrade(planId: string) {
    if (planId === 'FREE') return;
    setSelectedPlan(planId);
    setIsProcessing(true);
    setErrorMessage('');

    try {
      // 1. Create Order on Backend
      const orderRes = await createSubscriptionOrder(planId);
      if (!orderRes.success || !orderRes.data) {
        setErrorMessage(orderRes.message || 'Failed to create payment order.');
        setIsProcessing(false);
        return;
      }

      const orderData = orderRes.data;

      // 2. Open Razorpay Checkout or Fallback Simulated Verification
      const razorpayOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'StreamVault Premium',
        description: `Upgrade to ${orderData.planName} Plan`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          await verifyAndFinalize(response, planId);
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        try {
          const rzp = new (window as any).Razorpay(razorpayOptions);
          rzp.on('payment.failed', function (resp: any) {
            setErrorMessage(resp.error?.description || 'Payment was declined.');
            setIsProcessing(false);
          });
          rzp.open();
        } catch {
          // If script blocked by ad-blocker, simulate test verification
          await simulateTestPayment(orderData.orderId, planId);
        }
      } else {
        // Fallback test verification
        await simulateTestPayment(orderData.orderId, planId);
      }
    } catch {
      setErrorMessage('Something went wrong during payment processing.');
      setIsProcessing(false);
    }
  }

  async function simulateTestPayment(orderId: string, planId: string) {
    const testPaymentId = `pay_test_${Date.now()}`;
    await verifyAndFinalize(
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: `demo_sig_${Date.now()}`,
      },
      planId
    );
  }

  async function verifyAndFinalize(paymentResponse: any, planId: string) {
    try {
      const verifyRes = await verifySubscriptionPayment({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        planType: planId,
      });

      if (verifyRes.success && verifyRes.data) {
        // Update user state in auth context
        if (verifyRes.data.user) {
          const currentToken = localStorage.getItem('sv_token') || localStorage.getItem('token') || '';
          login(verifyRes.data.user, currentToken);
        }
        setInvoice(verifyRes.data.invoice);
      } else {
        setErrorMessage(verifyRes.message || 'Payment verification failed.');
      }
    } catch {
      setErrorMessage('Failed to verify payment with server.');
    } finally {
      setIsProcessing(false);
    }
  }

  function handlePrintInvoice() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative glass rounded-3xl p-6 sm:p-8 border border-[var(--border-color)] max-w-4xl w-full bg-[var(--bg-primary)] shadow-2xl my-8">
        {/* Close Button */}
        <button
          id="close-subscription-modal-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          ✕
        </button>

        {invoice ? (
          // ─── Invoice Screen (After Payment Success) ──────────────
          <div className="flex flex-col items-center text-center py-4 animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-3xl mb-4">
              ✓
            </div>
            <h3 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-1">
              Payment Successful!
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
              Your account has been upgraded to <strong className="text-[var(--brand)]">{invoice.planName}</strong> plan. A confirmation has been sent to your email.
            </p>

            {/* Official Invoice Receipt Card */}
            <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-left mb-6 text-xs sm:text-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] mb-4">
                <div>
                  <span className="font-bold text-[var(--text-primary)] text-base">StreamVault</span>
                  <p className="text-[11px] text-[var(--text-secondary)]">Tax Invoice / Receipt</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-400">
                  {invoice.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                <div>
                  <p className="text-[var(--text-secondary)]">Invoice No:</p>
                  <p className="font-mono font-semibold text-[var(--text-primary)]">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-[var(--text-secondary)]">Date:</p>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {new Date(invoice.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-secondary)]">Customer:</p>
                  <p className="font-semibold text-[var(--text-primary)]">{invoice.customerName}</p>
                </div>
                <div>
                  <p className="text-[var(--text-secondary)]">Payment ID:</p>
                  <p className="font-mono font-semibold text-[var(--text-primary)] truncate" title={invoice.paymentId}>
                    {invoice.paymentId}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Plan Subscription:</span>
                  <span className="font-medium text-[var(--text-primary)]">{invoice.planName} ({invoice.billingCycle})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Subtotal:</span>
                  <span className="text-[var(--text-primary)]">{invoice.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">GST (18%):</span>
                  <span className="text-[var(--text-primary)]">{invoice.tax}</span>
                </div>
                <div className="flex justify-between font-bold text-sm sm:text-base pt-2 border-t border-[var(--border-color)] text-[var(--brand)]">
                  <span>Total Paid:</span>
                  <span>{invoice.totalAmount}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border-color)] text-[11px] text-[var(--text-secondary)] text-center">
                Valid until {invoice.validUntil} • Thank you for supporting StreamVault!
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrintInvoice}
                className="px-4 py-2 rounded-xl text-xs font-semibold glass border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-all flex items-center gap-2"
              >
                <span>🖨️</span>
                <span>Print / Download Invoice</span>
              </button>
              <Button variant="primary" size="sm" onClick={onClose}>
                Done & Continue
              </Button>
            </div>
          </div>
        ) : (
          // ─── Plan Comparison & Selection ────────────────────────
          <div>
            <div className="text-center mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
                Upgrade Your Experience
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-1">
                Choose the Perfect Plan
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-lg mx-auto">
                Unlock higher daily download limits, ad-free streaming, 4K video quality, and interactive Watch Party recording.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
                {errorMessage}
              </div>
            )}

            {isLoading ? (
              <div className="py-16 text-center text-xs text-[var(--text-secondary)]">
                <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Loading subscription plans…
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {plans.map((p) => {
                  const isCurrent = user?.planType === p.id;
                  const isGold = p.id === 'GOLD';
                  const isSilver = p.id === 'SILVER';

                  return (
                    <div
                      key={p.id}
                      id={`plan-card-${p.id.toLowerCase()}`}
                      className={`relative rounded-2xl p-5 flex flex-col justify-between transition-all ${
                        isGold
                          ? 'glass border-2 border-yellow-500/50 bg-yellow-500/5 shadow-xl shadow-yellow-500/10'
                          : isSilver
                          ? 'glass border-2 border-[var(--brand)]/60 bg-[var(--brand)]/5'
                          : 'glass border border-[var(--border-color)] bg-[var(--bg-secondary)]/50'
                      }`}
                    >
                      {/* Popular / Best Value Badge */}
                      {isGold && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-yellow-500 to-amber-600 text-black uppercase tracking-wider">
                          Best Value
                        </span>
                      )}
                      {isSilver && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-[var(--brand)] text-white uppercase tracking-wider">
                          Most Popular
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-display font-bold text-base text-[var(--text-primary)]">
                            {p.name}
                          </h4>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="mb-4">
                          <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
                            {p.price === 0 ? 'Free' : `₹${p.price}`}
                          </span>
                          {p.price > 0 && (
                            <span className="text-xs text-[var(--text-secondary)]"> / month</span>
                          )}
                        </div>

                        <p className="text-[11px] text-[var(--text-secondary)] mb-4 leading-relaxed">
                          {p.tagline}
                        </p>

                        <ul className="flex flex-col gap-2 text-xs text-[var(--text-primary)] mb-6">
                          <li className="flex items-center gap-2">
                            <span className="text-green-400 font-bold">✓</span>
                            <span><strong>{p.downloadsPerDay}</strong> downloads</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-400 font-bold">✓</span>
                            <span>{p.streamingQuality}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-400 font-bold">✓</span>
                            <span>Watch Party: {p.watchPartyLimit}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className={p.hasAdFree ? 'text-green-400 font-bold' : 'text-gray-500'}>
                              {p.hasAdFree ? '✓' : '✕'}
                            </span>
                            <span className={p.hasAdFree ? '' : 'text-gray-500 line-through'}>
                              Ad-Free Experience
                            </span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className={p.hasRecording ? 'text-green-400 font-bold' : 'text-gray-500'}>
                              {p.hasRecording ? '✓' : '✕'}
                            </span>
                            <span className={p.hasRecording ? '' : 'text-gray-500 line-through'}>
                              Session Recording
                            </span>
                          </li>
                        </ul>
                      </div>

                      <button
                        id={`upgrade-plan-btn-${p.id.toLowerCase()}`}
                        onClick={() => handleUpgrade(p.id)}
                        disabled={isCurrent || p.id === 'FREE' || isProcessing}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isCurrent
                            ? 'bg-white/10 text-gray-400 cursor-not-allowed'
                            : p.id === 'FREE'
                            ? 'bg-transparent border border-[var(--border-color)] text-gray-400 cursor-not-allowed'
                            : isGold
                            ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black hover:brightness-110 shadow-lg'
                            : 'bg-[var(--brand)] text-white hover:brightness-110 shadow-md'
                        }`}
                      >
                        {isProcessing && selectedPlan === p.id
                          ? 'Processing…'
                          : isCurrent
                          ? 'Current Plan'
                          : p.id === 'FREE'
                          ? 'Default'
                          : `Upgrade to ${p.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
              <span>💳 Secure payments powered by Razorpay (Test Mode)</span>
              <span>•</span>
              <span>Instant activation & Tax invoice</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
