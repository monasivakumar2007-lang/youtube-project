'use client';

// ============================================================
// components/layout/Navbar.tsx
// Navigation bar across StreamVault with theme toggle & auth state
// ============================================================

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { logoutUser } from '@/lib/auth';
import Button from '@/components/ui/Button';
import type { ThemePreference } from '@/types';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { preference, setPreference } = useTheme();

  const themeOptions: { label: string; value: ThemePreference; icon: string }[] = [
    { label: 'Auto', value: 'AUTO', icon: '🌗' },
    { label: 'Light', value: 'LIGHT', icon: '☀️' },
    { label: 'Dark', value: 'DARK', icon: '🌙' },
  ];

  async function handleLogout() {
    await logoutUser();
    router.push('/login');
  }

  return (
    <nav className="sticky top-0 z-40 glass border-b border-[var(--border-color)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Logo & Main Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" id="nav-logo" className="flex items-center gap-2.5 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">🎬</span>
            <span className="font-display font-bold text-xl tracking-tight text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
              StreamVault
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/videos"
              id="nav-videos-link"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith('/videos') && !pathname.includes('/upload')
                  ? 'bg-[var(--brand)]/15 text-[var(--brand)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              Explore Videos
            </Link>

            {isAuthenticated && (
              <Link
                href="/dashboard"
                id="nav-main-dashboard-link"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/dashboard'
                    ? 'bg-[var(--brand)]/15 text-[var(--brand)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                Dashboard & Downloads
              </Link>
            )}
          </div>
        </div>

        {/* Right Nav: Upload, Theme, Auth */}
        <div className="flex items-center gap-2.5">
          {/* Upload CTA (Visible to authenticated or opens upload page) */}
          <Link
            href="/videos/upload"
            id="nav-upload-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[var(--brand)] text-white hover:brightness-110 transition-all shadow-sm shadow-[var(--brand)]/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Upload</span>
          </Link>

          {/* Theme switcher */}
          <div
            id="nav-theme-switcher"
            className="hidden sm:flex items-center p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]"
          >
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                id={`navbar-theme-${opt.value.toLowerCase()}`}
                onClick={() => setPreference(opt.value)}
                title={`Theme: ${opt.label}`}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  preference === opt.value
                    ? 'bg-[var(--brand)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {opt.icon}
              </button>
            ))}
          </div>

          {/* Auth State */}
          {!isLoading && (
            isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  id="nav-user-dashboard-link"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-color)] transition-all"
                  title="Dashboard"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--brand)]/20 border border-[var(--brand)]/40 flex items-center justify-center text-xs font-bold text-[var(--brand)]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden lg:inline text-xs font-medium text-[var(--text-primary)] max-w-[100px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                </Link>

                <Button
                  id="nav-signout-btn"
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="hidden sm:inline-flex"
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  id="nav-login-link"
                  className="text-xs sm:text-sm font-medium px-3 py-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  id="nav-register-link"
                  className="text-xs sm:text-sm font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all"
                >
                  Register
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
