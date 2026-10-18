import type { Metadata } from 'next';
import DashboardView from './DashboardView';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your StreamVault dashboard — manage your account and discover content.',
};

export default function DashboardPage() {
  return <DashboardView />;
}
