'use client';

// ============================================================
// app/(auth)/register/RegisterForm.tsx
// Full registration form with validation and OTP trigger
// ============================================================

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthCard from '@/components/auth/AuthCard';
import AlertBanner from '@/components/auth/AlertBanner';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { registerUser } from '@/lib/auth';

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) errors.name = 'Full name is required.';
  else if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email.trim()) errors.email = 'Email address is required.';
  else if (!emailRegex.test(form.email.trim())) errors.email = 'Please enter a valid email address.';

  if (!form.password) errors.password = 'Password is required.';
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.';
  else if (!/[a-zA-Z]/.test(form.password)) errors.password = 'Password must contain at least one letter.';
  else if (!/[0-9]/.test(form.password)) errors.password = 'Password must contain at least one number.';

  if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.';

  return errors;
}

// Password strength scorer
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-yellow-500' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-blue-500' };
  return { score, label: 'Strong', color: 'bg-green-500' };
}

export default function RegisterForm() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const strength = getPasswordStrength(form.password);

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
      const result = await registerUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (result.success && result.requiresOtp) {
        // Navigate to OTP verify page with email in query
        const devParam = (result as any).devOtp ? `&devOtp=${encodeURIComponent((result as any).devOtp)}` : '';
        router.push(
          `/verify-otp?email=${encodeURIComponent(result.email || form.email.trim().toLowerCase())}&purpose=REGISTRATION${devParam}`
        );
      } else if (!result.success) {
        setApiError(result.message || 'Registration failed. Please try again.');
      }
    } catch {
      setApiError('Something went wrong. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const eyeIcon = (show: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? (
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
  );

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join StreamVault and start streaming today"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" id="register-login-link" className="text-[var(--brand)] hover:underline font-medium">
            Sign in
          </Link>
        </>
      }
    >
      <form id="register-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {apiError && <AlertBanner type="error" message={apiError} />}

        <Input
          id="register-name"
          label="Full name"
          type="text"
          placeholder="Jane Smith"
          autoComplete="name"
          value={form.name}
          onChange={handleChange('name')}
          error={errors.name}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          disabled={isLoading}
        />

        <Input
          id="register-email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={handleChange('email')}
          error={errors.email}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          disabled={isLoading}
        />

        <div className="flex flex-col gap-1.5">
          <Input
            id="register-password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange('password')}
            error={errors.password}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            rightElement={eyeIcon(showPassword, () => setShowPassword((v) => !v))}
            disabled={isLoading}
          />
          {/* Password strength bar */}
          {form.password && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                      i <= strength.score ? strength.color : 'bg-[var(--border-color)]'
                    }`}
                  />
                ))}
              </div>
              <span className={`text-xs font-medium ${
                strength.label === 'Weak' ? 'text-red-400' :
                strength.label === 'Fair' ? 'text-yellow-400' :
                strength.label === 'Good' ? 'text-blue-400' : 'text-green-400'
              }`}>
                {strength.label}
              </span>
            </div>
          )}
        </div>

        <Input
          id="register-confirm-password"
          label="Confirm password"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Repeat your password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange('confirmPassword')}
          error={errors.confirmPassword}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
          rightElement={eyeIcon(showConfirmPassword, () => setShowConfirmPassword((v) => !v))}
          disabled={isLoading}
        />

        <Button
          id="register-submit-btn"
          type="submit"
          size="lg"
          isLoading={isLoading}
          className="w-full mt-2"
        >
          {isLoading ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="text-xs text-center text-[var(--text-secondary)]">
          By signing up you agree to our{' '}
          <span className="text-[var(--brand)]">Terms of Service</span> and{' '}
          <span className="text-[var(--brand)]">Privacy Policy</span>.
        </p>
      </form>
    </AuthCard>
  );
}
