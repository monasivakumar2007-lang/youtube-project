import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your StreamVault account to watch videos and join watch parties.',
};

export default function LoginPage() {
  return <LoginForm />;
}
