import type { Metadata } from 'next';
import LandingPage from './LandingPage';

export const metadata: Metadata = {
  title: 'StreamVault — Watch, Stream & Connect',
  description:
    'StreamVault is a modern video streaming and social platform. Watch HD videos, join live watch parties, and connect with creators worldwide.',
};

export default function HomePage() {
  return <LandingPage />;
}
