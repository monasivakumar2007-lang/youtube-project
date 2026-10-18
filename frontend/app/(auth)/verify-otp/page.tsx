import type { Metadata } from 'next';
import OtpVerifyForm from './OtpVerifyForm';

export const metadata: Metadata = {
  title: 'Verify Your Code',
  description: 'Enter the 6-digit verification code sent to your email to complete authentication.',
};

export default function VerifyOtpPage() {
  return <OtpVerifyForm />;
}
