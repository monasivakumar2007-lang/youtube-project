import type { Metadata } from 'next';
import RegisterForm from './RegisterForm';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Sign up for StreamVault — start watching HD videos and joining watch parties today.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
