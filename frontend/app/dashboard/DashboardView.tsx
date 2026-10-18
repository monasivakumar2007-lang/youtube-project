'use client';

// ============================================================
// app/dashboard/DashboardView.tsx
// Authenticated Dashboard with Downloads History, Subscription Upgrade,
// Theme Preferences, and Moderation
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { logoutUser } from '@/lib/auth';
import { getUserDownloads, DownloadRecord, DownloadQuota } from '@/lib/downloadApi';
import { getSubscriptionHistory } from '@/lib/subscriptionApi';
import { getFlaggedComments, CommentItem } from '@/lib/commentApi';
import { getLoginHistory } from '@/lib/themeApi';
import Button from '@/components/ui/Button';
import SubscriptionModal from '@/components/subscription/SubscriptionModal';
import { formatDuration, resolveThumbnailUrl } from '@/lib/videoApi';
import type { ThemePreference } from '@/types';

const planColors: Record<string, string> = {
  FREE:   'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  BRONZE: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  SILVER: 'bg-slate-400/20 text-slate-300 border border-slate-400/30',
  GOLD:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
};

const planIcons: Record<string, string> = {
  FREE: '🆓', BRONZE: '🥉', SILVER: '🥈', GOLD: '🥇',
};

const roleColors: Record<string, string> = {
  USER:  'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  ADMIN: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
};

type ActiveTab = 'overview' | 'downloads' | 'subscription' | 'security' | 'moderation';

export default function DashboardView() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { preference, resolvedTheme, setPreference } = useTheme();

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Downloads state (Task 2)
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [downloadQuota, setDownloadQuota] = useState<DownloadQuota | null>(null);
  const [loadingDownloads, setLoadingDownloads] = useState<boolean>(false);

  // Subscriptions & Invoices (Task 3)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<boolean>(false);
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);

  // Security & Login History (Task 5)
  const [loginHistory, setLoginHistory] = useState<any[]>([]);

  // Moderation (Task 6 - Admin)
  const [flaggedComments, setFlaggedComments] = useState<CommentItem[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch downloads history & quota
  const loadDownloads = useCallback(async () => {
    setLoadingDownloads(true);
    try {
      const res = await getUserDownloads();
      if (res.success && res.data) {
        setDownloads(res.data.downloads || []);
        setDownloadQuota(res.data.quota || null);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDownloads(false);
    }
  }, []);

  // Fetch subscription history
  const loadSubscriptions = useCallback(async () => {
    try {
      const res = await getSubscriptionHistory();
      if (res.success && res.data) {
        setSubscriptionHistory(res.data);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch login history
  const loadSecurity = useCallback(async () => {
    try {
      const res = await getLoginHistory();
      if (res.success && res.data) {
        setLoginHistory(res.data);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch flagged comments for admin
  const loadModeration = useCallback(async () => {
    if (user?.role !== 'ADMIN') return;
    try {
      const res = await getFlaggedComments();
      if (res.success && res.data) {
        setFlaggedComments(res.data);
      }
    } catch {
      // ignore
    }
  }, [user?.role]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDownloads();
      loadSubscriptions();
      loadSecurity();
      loadModeration();
    }
  }, [isAuthenticated, loadDownloads, loadSubscriptions, loadSecurity, loadModeration]);

  async function handleLogout() {
    await logoutUser();
    router.push('/login');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)] text-sm">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const themeOptions: { label: string; value: ThemePreference; icon: string }[] = [
    { label: 'Auto (IST)', value: 'AUTO', icon: '🌗' },
    { label: 'Light', value: 'LIGHT', icon: '☀️' },
    { label: 'Dark', value: 'DARK', icon: '🌙' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Navigation bar */}
      <nav className="sticky top-0 z-30 glass border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" id="dashboard-logo" className="flex items-center gap-2 group">
            <span className="text-xl">🎬</span>
            <span className="font-display font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
              StreamVault
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/videos"
              id="dashboard-explore-videos-nav"
              className="hidden sm:inline-block text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Explore Videos
            </Link>

            {/* Upgrade Button */}
            <button
              id="dashboard-upgrade-plan-btn"
              onClick={() => setShowSubscriptionModal(true)}
              className="text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black hover:brightness-110 transition-all shadow-sm"
            >
              ⚡ Upgrade Plan
            </button>

            {/* Theme toggle (Task 5) */}
            <div
              id="theme-toggle-group"
              className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]"
            >
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  id={`theme-btn-${opt.value.toLowerCase()}`}
                  onClick={() => setPreference(opt.value)}
                  title={opt.label}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    preference === opt.value
                      ? 'bg-[var(--brand)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            <Button
              id="dashboard-logout-btn"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
            >
              Sign out
            </Button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Welcome back, {user.name.split(' ')[0]} 👋
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
              Manage your streaming profile, downloads, subscriptions, and security.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${planColors[user.planType] ?? ''}`}>
              {planIcons[user.planType]} {user.planType} Plan
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${roleColors[user.role] ?? ''}`}>
              {user.role}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] mb-8 overflow-x-auto pb-1">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'downloads', label: `My Downloads (${downloads.length})`, icon: '⬇️' },
            { id: 'subscription', label: 'Subscription & Invoices', icon: '💎' },
            { id: 'security', label: 'Security & Logins', icon: '🔒' },
            ...(user.role === 'ADMIN'
              ? [{ id: 'moderation', label: `Moderation (${flaggedComments.length})`, icon: '🚩' }]
              : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 border-b-2 ${
                activeTab === tab.id
                  ? 'border-[var(--brand)] text-[var(--brand)] bg-[var(--brand)]/5'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ─── TAB 1: OVERVIEW ──────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Plan Card */}
              <div className="glass rounded-2xl p-5 border border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--text-secondary)]">Subscription Tier</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${planColors[user.planType]}`}>
                    {user.planType}
                  </span>
                </div>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {user.planType === 'FREE' ? 'Free Tier' : `${user.planType} Member`}
                </p>
                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  className="mt-2 text-xs font-semibold text-[var(--brand)] hover:underline"
                >
                  Change Plan →
                </button>
              </div>

              {/* Downloads Today (Task 2) */}
              <div className="glass rounded-2xl p-5 border border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--text-secondary)]">Today&apos;s Downloads</span>
                  <span className="text-xs font-mono font-bold text-[var(--brand)]">
                    {downloadQuota ? `${downloadQuota.usedToday} / ${downloadQuota.dailyLimit}` : '—'}
                  </span>
                </div>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {downloadQuota?.remainingToday === 'Unlimited'
                    ? 'Unlimited'
                    : `${downloadQuota?.remainingToday ?? 1} left today`}
                </p>
                <button
                  onClick={() => setActiveTab('downloads')}
                  className="mt-2 text-xs font-semibold text-[var(--brand)] hover:underline"
                >
                  View Downloaded Videos →
                </button>
              </div>

              {/* Theme Mode (Task 5) */}
              <div className="glass rounded-2xl p-5 border border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--text-secondary)]">Theme Mode</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--brand)]/15 text-[var(--brand)]">
                    {resolvedTheme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                  </span>
                </div>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {preference} {preference === 'AUTO' ? '(10-12 IST)' : ''}
                </p>
                <div className="flex gap-1.5 mt-2">
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPreference(opt.value)}
                      className={`text-[11px] px-2 py-0.5 rounded ${
                        preference === opt.value
                          ? 'bg-[var(--brand)] text-white'
                          : 'text-[var(--text-secondary)] hover:text-white'
                      }`}
                    >
                      {opt.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Security (Task 5) */}
              <div className="glass rounded-2xl p-5 border border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--text-secondary)]">2FA & Security</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                    Protected
                  </span>
                </div>
                <p className="text-xl font-bold text-[var(--text-primary)]">OTP Enabled</p>
                <button
                  onClick={() => setActiveTab('security')}
                  className="mt-2 text-xs font-semibold text-[var(--brand)] hover:underline"
                >
                  View Login Audits →
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/videos"
                className="glass rounded-2xl p-5 border border-[var(--border-color)] hover:border-[var(--brand)]/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <h3 className="font-display font-bold text-base text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                    🎬 Video Catalog
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Stream high definition videos, download for offline viewing, or host a Watch Party with friends.
                  </p>
                </div>
                <span className="text-xl text-[var(--brand)] group-hover:translate-x-1 transition-transform ml-3">→</span>
              </Link>

              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="glass rounded-2xl p-5 border border-[var(--border-color)] hover:border-yellow-500/50 transition-all flex items-center justify-between text-left group"
              >
                <div>
                  <h3 className="font-display font-bold text-base text-[var(--text-primary)] group-hover:text-yellow-400 transition-colors">
                    💎 Upgrade to Gold VIP
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Get unlimited downloads, 4K streaming, and Watch Party session recording via Razorpay test integration.
                  </p>
                </div>
                <span className="text-xl text-yellow-400 group-hover:translate-x-1 transition-transform ml-3">→</span>
              </button>
            </div>

            {/* Profile Information Box */}
            <div className="glass rounded-2xl p-6 border border-[var(--border-color)]">
              <h3 className="font-display font-bold text-base text-[var(--text-primary)] mb-4">
                User Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-[var(--text-secondary)]">Name:</span>
                  <p className="font-semibold text-[var(--text-primary)] mt-0.5">{user.name}</p>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Email:</span>
                  <p className="font-semibold text-[var(--text-primary)] mt-0.5">{user.email}</p>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Account Created:</span>
                  <p className="font-semibold text-[var(--text-primary)] mt-0.5">
                    {new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Theme Preference:</span>
                  <p className="font-semibold text-[var(--text-primary)] mt-0.5">
                    {preference} Mode
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: MY DOWNLOADS (Task 2) ───────────────────────── */}
        {activeTab === 'downloads' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Quota Banner */}
            <div className="glass rounded-2xl p-5 border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                  Controlled Downloads Status
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Free users can download 1 video per day. Premium users get higher quotas based on plan.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-[var(--text-secondary)]">Daily Quota</p>
                  <p className="text-base font-bold text-[var(--brand)]">
                    {downloadQuota?.usedToday || 0} / {downloadQuota?.dailyLimit || 1} used
                  </p>
                </div>

                {user.planType === 'FREE' && (
                  <button
                    onClick={() => setShowSubscriptionModal(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-yellow-500 to-amber-600 text-black hover:brightness-110 shadow-sm"
                  >
                    Upgrade for More Downloads
                  </button>
                )}
              </div>
            </div>

            {/* Downloaded Videos List */}
            {loadingDownloads ? (
              <div className="py-12 text-center text-xs text-[var(--text-secondary)]">
                <div className="w-6 h-6 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading your downloaded videos…
              </div>
            ) : downloads.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center border border-[var(--border-color)]">
                <span className="text-4xl">⬇️</span>
                <h4 className="font-display font-bold text-base text-[var(--text-primary)] mt-3">
                  No downloads yet
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4 max-w-sm mx-auto">
                  Videos you download will appear here with full video details, download date, and re-download options.
                </p>
                <Link
                  href="/videos"
                  className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--brand)] text-white hover:brightness-110 shadow-sm"
                >
                  Explore Videos to Download →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {downloads.map((dl) => (
                  <div
                    key={dl.id}
                    className="glass rounded-2xl overflow-hidden border border-[var(--border-color)] flex flex-col justify-between hover:border-[var(--brand)]/40 transition-all group"
                  >
                    <div>
                      {/* Video Thumbnail */}
                      <div className="relative aspect-video bg-black overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveThumbnailUrl(dl.video?.thumbnailUrl)}
                          alt={dl.video?.title || 'Video'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {dl.video?.duration > 0 && (
                          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/80 text-white">
                            {formatDuration(dl.video?.duration)}
                          </span>
                        )}
                      </div>

                      {/* Video Info */}
                      <div className="p-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--brand)]/15 text-[var(--brand)] uppercase tracking-wider">
                          {dl.video?.category || 'Video'}
                        </span>
                        <h4 className="font-display font-bold text-sm text-[var(--text-primary)] mt-1.5 line-clamp-1">
                          {dl.video?.title}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mt-2">
                          <span>Downloaded: {new Date(dl.downloadedAt).toLocaleDateString()}</span>
                          <span className="font-semibold text-gray-400">Plan: {dl.planType}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 pt-0 flex items-center gap-2">
                      <Link
                        href={`/watch/${dl.videoId}`}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[var(--brand)]/15 hover:bg-[var(--brand)] text-[var(--brand)] hover:text-white text-center transition-all"
                      >
                        Watch
                      </Link>
                      <a
                        href={dl.video?.videoUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-xl text-xs font-semibold glass border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                        title="Re-download video file"
                      >
                        ⬇️
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: SUBSCRIPTION & INVOICES (Task 3) ─────────────── */}
        {activeTab === 'subscription' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Current Plan Card */}
            <div className="glass rounded-2xl p-6 border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs text-[var(--text-secondary)]">Active Subscription</span>
                <h3 className="font-display text-2xl font-bold text-[var(--text-primary)] mt-0.5 flex items-center gap-2">
                  <span>{planIcons[user.planType]}</span>
                  <span>StreamVault {user.planType} Plan</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {user.planType === 'FREE'
                    ? '1 video download per day, standard definition streaming, community access.'
                    : 'Premium access active with expanded download quotas and ad-free experience.'}
                </p>
              </div>

              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-yellow-500 to-amber-600 text-black hover:brightness-110 shadow-lg"
              >
                Change / Upgrade Plan →
              </button>
            </div>

            {/* Invoices & History */}
            <div className="glass rounded-2xl p-6 border border-[var(--border-color)]">
              <h3 className="font-display font-bold text-base text-[var(--text-primary)] mb-4">
                Billing & Transaction Invoices
              </h3>

              {subscriptionHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                  No previous transactions found. Upgrading your plan will generate downloadable tax invoices.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {subscriptionHistory.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[var(--text-primary)]">
                            {sub.planType} Subscription
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400">
                            {sub.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-mono">
                          Order: {sub.razorpayOrderId} • Pay ID: {sub.razorpayPaymentId || 'N/A'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          ₹{sub.amount / 100}
                        </span>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          {new Date(sub.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 4: SECURITY & LOGINS (Task 5) ───────────────────── */}
        {activeTab === 'security' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="glass rounded-2xl p-6 border border-[var(--border-color)]">
              <h3 className="font-display font-bold text-base text-[var(--text-primary)] mb-1">
                🔒 Two-Factor OTP & Location Protection
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6">
                StreamVault evaluates your device fingerprint, city, and state upon every login. If a new device or unfamiliar location is detected, a 6-digit verification code is required.
              </p>

              <h4 className="font-semibold text-xs text-[var(--text-primary)] uppercase tracking-wider mb-3">
                Recent Verified Login Sessions
              </h4>

              {loginHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                  No login audit records found.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {loginHistory.map((lh) => (
                    <div
                      key={lh.id}
                      className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">💻</span>
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">
                            {lh.cityRegion || lh.state || 'India Region'}
                          </p>
                          <p className="text-[11px] text-[var(--text-secondary)] truncate max-w-sm">
                            {lh.userAgent}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                          ✓ Verified Session
                        </span>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                          {new Date(lh.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 5: ADMIN MODERATION (Task 6) ───────────────────── */}
        {activeTab === 'moderation' && user.role === 'ADMIN' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="glass rounded-2xl p-6 border border-[var(--border-color)]">
              <h3 className="font-display font-bold text-base text-[var(--text-primary)] mb-1">
                🚩 Flagged Comments Queue
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6">
                Under StreamVault safety policy, reported comments are flagged for administrator review instead of being automatically deleted after a fixed number of dislikes.
              </p>

              {flaggedComments.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-secondary)] glass rounded-xl border border-[var(--border-color)]">
                  ✓ Moderation queue is clean. No comments currently pending review.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {flaggedComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-amber-500/30 flex flex-col gap-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--text-primary)]">{comment.user?.name}</span>
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            on &quot;{comment.video?.title}&quot;
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                          {comment.reportStatus}
                        </span>
                      </div>

                      <p className="text-sm text-[var(--text-primary)] bg-black/30 p-2.5 rounded-lg border border-white/5">
                        &quot;{comment.text}&quot;
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1">
                        <span>Report Reason: {comment.moderationReason || 'Reported by user'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">👍 {comment.likes}</span>
                          <span className="text-xs">👎 {comment.dislikes}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => {
          setShowSubscriptionModal(false);
          loadSubscriptions();
          loadDownloads();
        }}
        highlightPlan="SILVER"
      />
    </div>
  );
}
