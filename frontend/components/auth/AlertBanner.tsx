// ============================================================
// components/auth/AlertBanner.tsx
// Success / error / warning inline banners for auth flows
// ============================================================
'use client';

type AlertType = 'error' | 'success' | 'warning' | 'info';

interface AlertBannerProps {
  type: AlertType;
  message: string;
}

const styles: Record<AlertType, string> = {
  error:
    'bg-red-500/10 border border-red-500/30 text-red-400',
  success:
    'bg-green-500/10 border border-green-500/30 text-green-400',
  warning:
    'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400',
  info:
    'bg-blue-500/10 border border-blue-500/30 text-blue-400',
};

const icons: Record<AlertType, string> = {
  error:   '✕',
  success: '✓',
  warning: '⚠',
  info:    'ℹ',
};

export default function AlertBanner({ type, message }: AlertBannerProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm animate-fade-in ${styles[type]}`}
    >
      <span className="font-bold mt-0.5 flex-shrink-0">{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
}
