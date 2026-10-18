'use client';

// ============================================================
// app/(auth)/login/LoginForm.tsx
// Login form: credentials → OTP if required → JWT
// ============================================================

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthCard from '@/components/auth/AuthCard';
import AlertBanner from '@/components/auth/AlertBanner';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { loginUser, saveToken, saveUser } from '@/lib/auth';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/types';

interface FormState {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email.trim()) errors.email = 'Email address is required.';
  else if (!emailRegex.test(form.email.trim())) errors.email = 'Please enter a valid email address.';
  if (!form.password) errors.password = 'Password is required.';
  return errors;
}

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();

  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
      if (apiError) setApiError('');
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setApiError('');

    try {
      const result = await loginUser({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (result.requiresOtp) {
        // Redirect to OTP page with devOtp if present
        const devParam = (result as any).devOtp ? `&devOtp=${encodeURIComponent((result as any).devOtp)}` : '';
        router.push(
          `/verify-otp?email=${encodeURIComponent(result.email || form.email.trim().toLowerCase())}&purpose=${result.purpose || 'LOGIN'}${devParam}`
        );
        return;
      }

      if (result.success && result.token && result.user) {
        // Direct login — store session
        login(result.user as User, result.token);
        router.push('/dashboard');
        return;
      }

      setApiError(result.message || 'Login failed. Please try again.');
    } catch {
      setApiError('Something went wrong. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function fillDemoAccount(email: string, pass: string) {
    setForm({ email, password: pass });
    setErrors({});
    setApiError('');
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your StreamVault account"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/register" id="login-register-link" className="text-[var(--brand)] hover:underline font-medium">
            Create one
          </Link>
        </>
      }
    >
      {/* Quick Demo Fillers for testing */}
      <div className="mb-4 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs">
        <p className="font-semibold text-[var(--text-secondary)] mb-2">⚡ Quick Test Logins:</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => fillDemoAccount('alex@example.com', 'Password@123')}
            className="px-2 py-1 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)] hover:bg-[var(--brand)]/20 font-medium"
          >
            Alex (Free Plan)
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('sarah@example.com', 'Password@123')}
            className="px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 font-medium"
          >
            Sarah (Bronze Plan)
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('admin@streamvault.com', 'Admin@123')}
            className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 font-medium"
          >
            Admin (Gold VIP)
          </button>
        </div>
      </div>

      <form id="login-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {apiError && <AlertBanner type="error" message={apiError} />}

        <Input
          id="login-email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={handleChange('email')}
          error={errors.email}
          disabled={isLoading}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />

        <div className="flex flex-col gap-1.5">
          <Input
            id="login-password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Your password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange('password')}
            error={errors.password}
            disabled={isLoading}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            }
          />
        </div>

        <Button
          id="login-submit-btn"
          type="submit"
          size="lg"
          isLoading={isLoading}
          className="w-full mt-2"
        >
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Secured with OTP verification on new devices</span>
        </div>
      </form>
    </AuthCard>
  );
}
