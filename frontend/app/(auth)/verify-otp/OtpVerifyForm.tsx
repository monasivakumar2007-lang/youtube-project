'use client';

// ============================================================
// app/(auth)/verify-otp/OtpVerifyForm.tsx
// 6-digit OTP entry with auto-advance, resend cooldown
// ============================================================

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AuthCard from '@/components/auth/AuthCard';
import AlertBanner from '@/components/auth/AlertBanner';
import Button from '@/components/ui/Button';
import { verifyOtp, resendOtp } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/types';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

function OtpVerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const email = searchParams.get('email') || '';
  const purpose = searchParams.get('purpose') || 'LOGIN';
  const devOtp = searchParams.get('devOtp') || '';
  const [activeDevOtp, setActiveDevOtp] = useState<string>(devOtp);

  const [digits, setDigits] = useState<string[]>(
    devOtp && devOtp.length === OTP_LENGTH ? devOtp.split('') : Array(OTP_LENGTH).fill('')
  );
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function handleChange(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1);
    const updated = [...digits];
    updated[index] = char;
    setDigits(updated);
    setApiError('');

    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (char && updated.every((d) => d !== '') && index === OTP_LENGTH - 1) {
      submitOtp(updated.join(''));
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const updated = [...digits];
        updated[index] = '';
        setDigits(updated);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        const updated = [...digits];
        updated[index - 1] = '';
        setDigits(updated);
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const updated = [...digits];
    for (let i = 0; i < pasted.length; i++) updated[i] = pasted[i];
    setDigits(updated);
    const nextFocus = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextFocus]?.focus();

    if (pasted.length === OTP_LENGTH) {
      submitOtp(pasted);
    }
  }

  async function submitOtp(code: string) {
    if (!email) {
      setApiError('Missing email. Please go back and log in again.');
      return;
    }

    setIsVerifying(true);
    setApiError('');

    try {
      const result = await verifyOtp({ email, otp: code });

      if (result.success && result.token && result.user) {
        login(result.user as User, result.token);
        router.push('/dashboard');
        return;
      }

      setApiError(result.message || 'Invalid verification code. Please try again.');
      // Clear digits on error
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch {
      setApiError('Something went wrong. Please try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    if (!email || cooldown > 0 || isResending) return;

    setIsResending(true);
    setApiError('');
    setApiSuccess('');

    try {
      const res = await resendOtp(email);
      if (res.success) {
        setApiSuccess('A new 6-digit code has been sent.');
        setCooldown(RESEND_COOLDOWN);
        if (res.devOtp) {
          setActiveDevOtp(res.devOtp);
          setDigits(res.devOtp.split(''));
        } else {
          setDigits(Array(OTP_LENGTH).fill(''));
        }
        inputRefs.current[0]?.focus();
      } else {
        setApiError(res.message || 'Failed to resend OTP. Please try again.');
      }
    } catch {
      setApiError('Something went wrong. Please try again.');
    } finally {
      setIsResending(false);
    }
  }

  function handleManualSubmit() {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) {
      setApiError('Please enter all 6 digits.');
      return;
    }
    submitOtp(code);
  }

  const purposeLabel: Record<string, { title: string; description: string; icon: string }> = {
    REGISTRATION: {
      title: 'Verify your email',
      description: 'We sent a 6-digit code to complete your registration.',
      icon: '✉️',
    },
    NEW_DEVICE: {
      title: 'New device detected',
      description: 'We sent a code to verify this is really you.',
      icon: '💻',
    },
    NEW_LOCATION: {
      title: 'New location detected',
      description: 'We noticed you\'re signing in from a new location.',
      icon: '📍',
    },
    LOGIN: {
      title: 'Two-step verification',
      description: 'Enter the 6-digit code sent to your email.',
      icon: '🔐',
    },
  };

  const info = purposeLabel[purpose] || purposeLabel.LOGIN;
  const allFilled = digits.every((d) => d !== '');

  return (
    <AuthCard
      title={info.title}
      subtitle={info.description}
    >
      <div className="flex flex-col gap-5">
        {/* Purpose icon */}
        <div className="text-center text-4xl">{info.icon}</div>

        {/* Email display */}
        <div className="text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Code sent to
          </p>
          <p className="mt-0.5 font-semibold text-[var(--text-primary)] text-sm">
            {email || 'your email'}
          </p>
        </div>

        {/* Alerts */}
        {activeDevOtp && (
          <div className="p-3 rounded-xl bg-[var(--brand)]/10 border border-[var(--brand)]/30 text-[var(--brand)] text-xs text-center font-medium">
            ⚡ Dev Mode Code: <strong>{activeDevOtp}</strong> (Auto-filled)
          </div>
        )}
        {apiError && <AlertBanner type="error" message={apiError} />}
        {apiSuccess && <AlertBanner type="success" message={apiSuccess} />}

        {/* OTP digit boxes */}
        <div
          id="otp-input-group"
          className="flex gap-2 justify-center"
          role="group"
          aria-label="One-time password input"
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              id={`otp-digit-${i + 1}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={isVerifying}
              className={`
                w-11 h-14 text-center text-xl font-bold rounded-xl border outline-none transition-all duration-200
                bg-[var(--bg-secondary)] text-[var(--text-primary)]
                border-[var(--border-color)]
                focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)] focus:ring-opacity-30
                disabled:opacity-50 disabled:cursor-not-allowed
                caret-transparent
                ${digit ? 'border-[var(--brand)] bg-[var(--brand)]/5' : ''}
              `}
              aria-label={`OTP digit ${i + 1}`}
            />
          ))}
        </div>

        {/* Submit */}
        <Button
          id="otp-submit-btn"
          onClick={handleManualSubmit}
          size="lg"
          isLoading={isVerifying}
          disabled={!allFilled || isVerifying}
          className="w-full"
        >
          {isVerifying ? 'Verifying…' : 'Verify code'}
        </Button>

        {/* Resend */}
        <div className="text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Didn&apos;t receive a code?{' '}
            {cooldown > 0 ? (
              <span className="text-[var(--text-secondary)]">
                Resend in <span className="font-semibold text-[var(--brand)]">{cooldown}s</span>
              </span>
            ) : (
              <button
                id="otp-resend-btn"
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-[var(--brand)] hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? 'Sending…' : 'Resend code'}
              </button>
            )}
          </p>
        </div>

        {/* Back link */}
        <button
          id="otp-back-btn"
          type="button"
          onClick={() => router.back()}
          className="text-sm text-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ← Go back
        </button>

        {/* Dev mode notice */}
        <div className="mt-1 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
          <strong>Dev mode:</strong> The OTP is printed to the backend console log (no email required during development).
        </div>
      </div>
    </AuthCard>
  );
}

export default function OtpVerifyForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-[var(--text-secondary)] animate-pulse">Loading…</div>
      </div>
    }>
      <OtpVerifyInner />
    </Suspense>
  );
}
