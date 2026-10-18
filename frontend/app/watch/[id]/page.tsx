'use client';

// ============================================================
// app/watch/[id]/page.tsx
// Video Watch Page with Custom Player, Info, Watch Party,
// Controlled Downloads, and Multilingual Comments
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import VideoPlayer from '@/components/video/VideoPlayer';
import CommentSection from '@/components/video/CommentSection';
import SubscriptionModal from '@/components/subscription/SubscriptionModal';
import Button from '@/components/ui/Button';
import { getVideo, getVideos, resolveThumbnailUrl, formatDuration } from '@/lib/videoApi';
import { requestVideoDownload } from '@/lib/downloadApi';
import { createWatchParty } from '@/lib/watchPartyApi';
import { useAuth } from '@/context/AuthContext';
import type { Video } from '@/types';

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const videoId = typeof params?.id === 'string' ? params.id : '';

  const [video, setVideo] = useState<Video | null>(null);
  const [upNextVideos, setUpNextVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showFullDesc, setShowFullDesc] = useState<boolean>(false);

  // Watch Party creation state
  const [isCreatingParty, setIsCreatingParty] = useState<boolean>(false);

  // Download state
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadNotice, setDownloadNotice] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string>('');

  // Subscription upgrade modal
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<boolean>(false);

  // ─── Fetch Current Video & Up-Next Recommendations ──────────
  const fetchVideoData = useCallback(async (id: string) => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch current video details
      const videoRes = await getVideo(id);
      if (!videoRes.success || !videoRes.data) {
        setError(videoRes.message || 'Video not found or has been removed.');
        setIsLoading(false);
        return;
      }

      setVideo(videoRes.data);

      // 2. Fetch recommended / up next videos
      const listRes = await getVideos({ limit: 10 });
      if (listRes.success && listRes.data?.videos) {
        const filtered = listRes.data.videos.filter((v) => v.id !== id);
        setUpNextVideos(filtered);
      }
    } catch {
      setError('Unable to load video details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (videoId) {
      fetchVideoData(videoId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [videoId, fetchVideoData]);

  // ─── Share link handler ─────────────────────────────────────
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  // ─── Start Watch Party (Task 1) ─────────────────────────────
  const handleStartWatchParty = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/watch/${videoId}`);
      return;
    }

    setIsCreatingParty(true);
    try {
      const res = await createWatchParty(videoId, true);
      if (res.success && res.data?.roomId) {
        router.push(`/watch-party/${res.data.roomId}`);
      } else {
        alert(res.message || 'Could not start watch party.');
      }
    } catch {
      alert('Failed to start watch party.');
    } finally {
      setIsCreatingParty(false);
    }
  };

  // ─── Controlled Download Handler (Task 2) ───────────────────
  const handleDownload = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/watch/${videoId}`);
      return;
    }

    setIsDownloading(true);
    setDownloadNotice('');
    setDownloadError('');

    try {
      const res = await requestVideoDownload(videoId);

      if (res.success && res.data) {
        // Trigger browser file download
        const downloadUrl = res.data.downloadUrl;
        const remaining = res.data.quota?.remainingToday;

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${video?.title || 'streamvault_video'}.mp4`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setDownloadNotice(
          `✓ Download authorized! You have ${remaining} downloads remaining today.`
        );
        setTimeout(() => setDownloadNotice(''), 5000);
      } else {
        // Daily quota exceeded or other limitation -> Prompt upgrade modal
        setDownloadError(res.message || 'Daily download limit reached.');
        setShowSubscriptionModal(true);
      }
    } catch {
      setDownloadError('Network error while processing download.');
    } finally {
      setIsDownloading(false);
    }
  };

  const nextVideo = upNextVideos.length > 0 ? upNextVideos[0] : null;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {isLoading ? (
          <div className="py-28 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-12 h-12 border-4 border-[var(--border-color)] border-t-[var(--brand)] rounded-full animate-spin" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">Loading video player…</p>
          </div>
        ) : error || !video ? (
          <div className="glass rounded-2xl p-10 border border-red-500/30 text-center max-w-lg mx-auto my-16">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 mx-auto flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-display font-bold text-xl text-[var(--text-primary)] mb-2">
              Video Unavailable
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {error || 'This video does not exist or may have been removed by the creator.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="ghost" onClick={() => router.push('/videos')}>
                ← Back to Catalog
              </Button>
              <Button variant="primary" onClick={() => fetchVideoData(videoId)}>
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Columns: Video Player, Actions, Metadata & Multilingual Comments */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Custom Video Player (Task 4) */}
              <VideoPlayer
                key={video.id}
                video={video}
                nextVideo={nextVideo}
                onEnded={() => {
                  if (nextVideo) {
                    // Handled inside VideoPlayer up next overlay
                  }
                }}
              />

              {/* Toast Notices for Download / Limit */}
              {downloadNotice && (
                <div className="p-3.5 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs sm:text-sm font-semibold animate-fade-in flex items-center gap-2">
                  <span>⬇️</span>
                  <span>{downloadNotice}</span>
                </div>
              )}
              {downloadError && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-semibold animate-fade-in flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{downloadError}</span>
                  </div>
                  <button
                    onClick={() => setShowSubscriptionModal(true)}
                    className="underline text-xs hover:text-white"
                  >
                    View Upgrade Plans →
                  </button>
                </div>
              )}

              {/* Video Title & Actions */}
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-[var(--text-primary)] leading-snug">
                  {video.title}
                </h1>

                {/* Metadata & Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 mt-3 pb-4 border-b border-[var(--border-color)]">
                  {/* Views & Date & Category */}
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {(video.views || 0).toLocaleString()} views
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(video.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--brand)]/15 text-[var(--brand)]">
                      {video.category}
                    </span>
                  </div>

                  {/* Actions: Watch Party (Task 1), Download (Task 2), Share */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Watch Party Button */}
                    <button
                      id="watch-start-party-btn"
                      onClick={handleStartWatchParty}
                      disabled={isCreatingParty}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:brightness-110 shadow-sm transition-all"
                    >
                      <span>🎉</span>
                      <span>{isCreatingParty ? 'Starting…' : 'Watch Party'}</span>
                    </button>

                    {/* Controlled Download Button */}
                    <button
                      id="watch-download-btn"
                      onClick={handleDownload}
                      disabled={isDownloading}
                      title={
                        user?.planType === 'FREE'
                          ? 'Free Plan: 1 download / day'
                          : user?.planType === 'BRONZE'
                          ? 'Bronze Plan: 5 downloads / day'
                          : user?.planType === 'SILVER'
                          ? 'Silver Plan: 15 downloads / day'
                          : 'Gold Plan: Unlimited downloads'
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold glass border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:border-[var(--brand)]/40 transition-all"
                    >
                      <span>⬇️</span>
                      <span>{isDownloading ? 'Checking…' : 'Download'}</span>
                      {user && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--brand)]/20 text-[var(--brand)]">
                          {user.planType}
                        </span>
                      )}
                    </button>

                    {/* Share Button */}
                    <button
                      id="watch-share-btn"
                      onClick={handleShare}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold glass border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all"
                    >
                      {isCopied ? (
                        <>
                          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          <span>Share</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Creator Profile Box */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--brand)]/20 border border-[var(--brand)]/40 flex items-center justify-center font-bold text-sm text-[var(--brand)]">
                    {(video.uploadedBy?.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      {video.uploadedBy?.name || 'StreamVault Creator'}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)]">Verified Creator</p>
                  </div>
                </div>

                {/* Description Box */}
                {video.description && (
                  <div className="mt-4 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                    <p
                      className={`text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed ${
                        !showFullDesc && video.description.length > 280 ? 'line-clamp-3' : ''
                      }`}
                    >
                      {video.description}
                    </p>
                    {video.description.length > 280 && (
                      <button
                        onClick={() => setShowFullDesc((prev) => !prev)}
                        className="mt-2 text-xs font-bold text-[var(--brand)] hover:underline"
                      >
                        {showFullDesc ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Task 6: Multilingual Comments Section */}
              <CommentSection videoId={video.id} />
            </div>

            {/* Right Column: Up Next / Recommended List */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">
                  Up Next
                </h3>
                <span className="text-xs text-[var(--text-secondary)]">
                  {upNextVideos.length} recommendations
                </span>
              </div>

              {upNextVideos.length === 0 ? (
                <div className="p-6 rounded-2xl glass border border-[var(--border-color)] text-center text-xs text-[var(--text-secondary)]">
                  No other videos found.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {upNextVideos.map((item) => (
                    <Link
                      key={item.id}
                      href={`/watch/${item.id}`}
                      id={`upnext-card-${item.id}`}
                      className="group flex gap-3 p-2 rounded-xl glass border border-transparent hover:border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-all"
                    >
                      {/* Compact Thumbnail */}
                      <div className="relative w-36 aspect-video rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveThumbnailUrl(item.thumbnailUrl)}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {item.duration > 0 && (
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/80 text-white font-mono">
                            {formatDuration(item.duration)}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <h4
                          className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-snug group-hover:text-[var(--brand)] transition-colors"
                          title={item.title}
                        >
                          {item.title}
                        </h4>

                        <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                          <p className="truncate">{item.uploadedBy?.name || 'Creator'}</p>
                          <p className="truncate mt-0.5">
                            {(item.views || 0).toLocaleString()} views
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Subscription Upgrade Modal (Task 3) */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        highlightPlan={user?.planType === 'FREE' ? 'BRONZE' : 'GOLD'}
      />
    </div>
  );
}
