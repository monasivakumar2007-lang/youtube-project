'use client';

// ============================================================
// app/LandingPage.tsx
// Premium StreamVault landing page — Phase 2
// ============================================================

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const features = [
  {
    icon: '🎬',
    title: 'HD Video Streaming',
    desc: 'Crystal-clear HD video playback with adaptive quality for any connection speed.',
  },
  {
    icon: '🔐',
    title: 'Secure Authentication',
    desc: 'OTP verification, device detection, and JWT-secured sessions keep your account safe.',
  },
  {
    icon: '🎉',
    title: 'Live Watch Parties',
    desc: 'Watch videos together in real-time with friends, with synchronized playback.',
  },
  {
    icon: '🌍',
    title: 'Multilingual Comments',
    desc: 'AI-powered comment translation so everyone can join the conversation.',
  },
  {
    icon: '📱',
    title: 'Download & Go',
    desc: 'Download videos for offline viewing based on your subscription plan.',
  },
  {
    icon: '🌗',
    title: 'Smart Dark/Light Mode',
    desc: 'IST-aware auto theme — light from 10–12 AM, dark the rest of the day.',
  },
];

const plans = [
  { name: 'Free', price: '₹0', icon: '🆓', downloads: '1/day', color: 'border-gray-500/30' },
  { name: 'Bronze', price: '₹99', icon: '🥉', downloads: '5/day', color: 'border-orange-500/30' },
  { name: 'Silver', price: '₹299', icon: '🥈', downloads: '15/day', color: 'border-slate-400/30', popular: true },
  { name: 'Gold', price: '₹599', icon: '🥇', downloads: 'Unlimited', color: 'border-yellow-500/30' },
];

export default function LandingPage() {
  const { isAuthenticated, user, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Navigation */}
      <nav className="sticky top-0 z-30 glass border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎬</span>
            <span className="font-display font-bold text-lg text-[var(--text-primary)]">StreamVault</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/videos"
              id="landing-explore-videos-nav"
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2 py-1 rounded-lg hover:bg-[var(--bg-secondary)]"
            >
              Explore Videos
            </Link>

            {!isLoading && (
              isAuthenticated && user ? (
                <Link
                  href="/dashboard"
                  id="nav-dashboard-link"
                  className="text-sm font-medium px-4 py-2 rounded-xl bg-[var(--brand)] text-white hover:brightness-110 transition-all"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    id="nav-login-link"
                    className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    id="nav-register-link"
                    className="text-sm font-semibold px-4 py-2 rounded-xl bg-[var(--brand)] text-white hover:brightness-110 transition-all shadow-lg shadow-[var(--brand)]/20"
                  >
                    Get started
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-20 pb-24 text-center">
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[var(--brand)] opacity-[0.07] blur-3xl" />
          <div className="absolute top-40 right-0 w-[300px] h-[300px] rounded-full bg-purple-600 opacity-[0.06] blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-cyan-500 opacity-[0.04] blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[var(--border-color)] text-xs font-medium text-[var(--text-secondary)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Phase 3 — Video Catalog, Custom Player & Uploads Live
          </div>

          <h1 className="font-display text-5xl sm:text-6xl font-bold text-[var(--text-primary)] leading-tight mb-6">
            Stream. Connect.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand)] to-purple-500">
              Experience.
            </span>
          </h1>

          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            StreamVault brings HD video streaming, live watch parties, and a global creator community — secured by OTP-verified accounts.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/videos"
              id="hero-explore-btn"
              className="px-8 py-3.5 rounded-xl bg-[var(--brand)] text-white font-semibold text-base hover:brightness-110 transition-all shadow-xl shadow-[var(--brand)]/25 active:scale-[0.98]"
            >
              Explore Videos 🎬
            </Link>
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                id="hero-dashboard-btn"
                className="px-8 py-3.5 rounded-xl glass border border-[var(--border-color)] text-[var(--text-primary)] font-semibold text-base hover:bg-[var(--bg-secondary)] transition-all active:scale-[0.98]"
              >
                Open Dashboard →
              </Link>
            ) : (
              <Link
                href="/register"
                id="hero-signup-btn"
                className="px-8 py-3.5 rounded-xl glass border border-[var(--border-color)] text-[var(--text-primary)] font-semibold text-base hover:bg-[var(--bg-secondary)] transition-all active:scale-[0.98]"
              >
                Start for free →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold text-[var(--text-primary)] mb-3">
            Everything you need
          </h2>
          <p className="text-[var(--text-secondary)]">
            Built for creators and viewers with enterprise-grade security.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-5 border border-[var(--border-color)] hover:border-[var(--brand)]/40 transition-all duration-300 hover:-translate-y-0.5 group"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-display font-semibold text-[var(--text-primary)] mb-2 group-hover:text-[var(--brand)] transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold text-[var(--text-primary)] mb-3">
            Simple, fair pricing
          </h2>
          <p className="text-[var(--text-secondary)]">
            Choose a plan that fits your streaming needs.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`glass rounded-2xl p-5 border ${p.color} relative hover:-translate-y-1 transition-all duration-300`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/30">
                    Most popular
                  </span>
                </div>
              )}
              <div className="text-3xl mb-3">{p.icon}</div>
              <h3 className="font-display font-bold text-lg text-[var(--text-primary)] mb-1">
                {p.name}
              </h3>
              <p className="text-2xl font-bold text-[var(--brand)] mb-3">{p.price}<span className="text-sm font-normal text-[var(--text-secondary)]">/mo</span></p>
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">{p.downloads}</span> download{p.downloads !== 'Unlimited' ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!isAuthenticated && (
        <section className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="glass rounded-3xl p-10 border border-[var(--border-color)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand)]/5 to-purple-600/5" aria-hidden />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold text-[var(--text-primary)] mb-3">
                Ready to start streaming?
              </h2>
              <p className="text-[var(--text-secondary)] mb-6">
                Create your free account in seconds — no credit card required.
              </p>
              <Link
                href="/register"
                id="cta-signup-btn"
                className="inline-block px-8 py-3.5 rounded-xl bg-[var(--brand)] text-white font-semibold text-base hover:brightness-110 transition-all shadow-xl shadow-[var(--brand)]/25 active:scale-[0.98]"
              >
                Create free account →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <span>🎬</span>
            <span className="font-display font-semibold text-[var(--text-primary)]">StreamVault</span>
          </div>
          <p>© {new Date().getFullYear()} StreamVault. Built with Phase 2 auth.</p>
        </div>
      </footer>
    </div>
  );
}
