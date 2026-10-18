'use client';

// ============================================================
// components/video/CommentSection.tsx
// Multilingual Comments Section with AI Moderation — Task 6
// ============================================================

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  CommentItem,
  getVideoComments,
  postComment,
  translateCommentText,
  likeComment,
  dislikeComment,
  reportComment,
} from '@/lib/commentApi';
import Button from '@/components/ui/Button';

interface CommentSectionProps {
  videoId: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'ja', label: 'Japanese (日本語)' },
];

const REPORT_REASONS = [
  'Inappropriate or offensive content',
  'Hate speech or harassment',
  'Spam or advertising link',
  'Repeated symbols / gibberish',
  'Misinformation',
];

export default function CommentSection({ videoId }: CommentSectionProps) {
  const { user, isAuthenticated } = useAuth();

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [shareLocation, setShareLocation] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Translation states: commentId -> translated text
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  // Report modal state
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0]);
  const [isReporting, setIsReporting] = useState<boolean>(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  // User liked/disliked sets for immediate visual feedback
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(new Set());

  // ─── Fetch Comments ─────────────────────────────────────────
  const fetchComments = useCallback(async () => {
    if (!videoId) return;
    setIsLoading(true);
    try {
      const res = await getVideoComments(videoId);
      if (res.success && res.data) {
        setComments(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // ─── Post Comment ───────────────────────────────────────────
  async function handleCommentSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!newCommentText.trim()) {
      setErrorMessage('Please type a comment before posting.');
      return;
    }

    // Client-side quick check for excessive repeated special characters
    if (/([!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?`~])\1{3,}/.test(newCommentText)) {
      setErrorMessage('Please avoid repeated special characters (e.g. !!!!!!). Write a clear comment.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await postComment(videoId, newCommentText.trim(), shareLocation);
      if (res.success && res.data) {
        setComments((prev) => [res.data!, ...prev]);
        setNewCommentText('');
        setSuccessMessage('Comment posted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(res.message || 'Failed to post comment.');
      }
    } catch {
      setErrorMessage('Network error while posting comment.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Translate Comment ──────────────────────────────────────
  async function handleTranslate(commentId: string) {
    if (translations[commentId]) {
      // Toggle off
      setTranslations((prev) => {
        const copy = { ...prev };
        delete copy[commentId];
        return copy;
      });
      return;
    }

    setTranslatingId(commentId);
    try {
      const res = await translateCommentText(commentId, selectedLanguage);
      if (res.success && res.data?.translatedText) {
        setTranslations((prev) => ({
          ...prev,
          [commentId]: res.data!.translatedText,
        }));
      }
    } catch {
      // fallback
    } finally {
      setTranslatingId(null);
    }
  }

  // ─── Like Comment ───────────────────────────────────────────
  async function handleLike(commentId: string) {
    if (likedIds.has(commentId)) return;
    setLikedIds((prev) => new Set([...prev, commentId]));
    setDislikedIds((prev) => {
      const copy = new Set(prev);
      copy.delete(commentId);
      return copy;
    });

    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likes: c.likes + 1 } : c))
    );

    await likeComment(commentId).catch(() => {});
  }

  // ─── Dislike Comment ────────────────────────────────────────
  async function handleDislike(commentId: string) {
    if (dislikedIds.has(commentId)) return;
    setDislikedIds((prev) => new Set([...prev, commentId]));
    setLikedIds((prev) => {
      const copy = new Set(prev);
      copy.delete(commentId);
      return copy;
    });

    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, dislikes: c.dislikes + 1 } : c))
    );

    await dislikeComment(commentId).catch(() => {});
  }

  // ─── Report Comment ─────────────────────────────────────────
  async function submitReport() {
    if (!reportingCommentId) return;
    setIsReporting(true);

    try {
      const res = await reportComment(reportingCommentId, reportReason);
      if (res.success) {
        setReportedIds((prev) => new Set([...prev, reportingCommentId]));
        setComments((prev) =>
          prev.map((c) =>
            c.id === reportingCommentId
              ? { ...c, isFlagged: true, reportStatus: 'PENDING_REVIEW' }
              : c
          )
        );
      }
    } catch {
      // ignore
    } finally {
      setIsReporting(false);
      setReportingCommentId(null);
    }
  }

  // Relative time helper
  function formatTimeAgo(dateString: string): string {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  }

  const planBadges: Record<string, { label: string; color: string }> = {
    GOLD: { label: '🥇 Gold VIP', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    SILVER: { label: '🥈 Silver', color: 'bg-slate-300/20 text-slate-300 border-slate-300/30' },
    BRONZE: { label: '🥉 Bronze', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    FREE: { label: 'Free', color: 'bg-gray-500/20 text-gray-400 border-gray-500/20' },
  };

  return (
    <div id="comments-section" className="flex flex-col gap-6 pt-6 border-t border-[var(--border-color)]">
      {/* Header with counts and language selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-xl font-bold text-[var(--text-primary)]">
            Comments
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--brand)]/15 text-[var(--brand)]">
            {comments.length}
          </span>
        </div>

        {/* Global Translation Language Target Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--text-secondary)]">Translate to:</span>
          <select
            id="comments-language-selector"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-2.5 py-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-medium focus:outline-none focus:border-[var(--brand)] cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comment Input Box */}
      {isAuthenticated ? (
        <form onSubmit={handleCommentSubmit} className="flex flex-col gap-3">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
              {successMessage}
            </div>
          )}

          <div className="relative">
            <textarea
              id="comment-input-textarea"
              rows={3}
              placeholder="Write a comment in any language (English, हिन्दी, Español, Français…) — Keep it friendly!"
              value={newCommentText}
              onChange={(e) => {
                setNewCommentText(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              className="w-full p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all resize-none placeholder:text-[var(--text-secondary)]/70"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Privacy: Optional location sharing */}
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                id="comment-share-location-checkbox"
                type="checkbox"
                checked={shareLocation}
                onChange={(e) => setShareLocation(e.target.checked)}
                className="rounded border-[var(--border-color)] text-[var(--brand)] focus:ring-0 cursor-pointer"
              />
              <span>📍 Share my region (e.g. Maharashtra, India) publicly</span>
            </label>

            <Button
              id="comment-submit-btn"
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={!newCommentText.trim() || isSubmitting}
            >
              Post Comment
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-2xl glass border border-[var(--border-color)] text-center text-xs text-[var(--text-secondary)]">
          <span>Sign in to join the conversation and share comments in any language. </span>
          <a href="/login" className="text-[var(--brand)] font-semibold hover:underline">
            Sign In →
          </a>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
          <div className="w-6 h-6 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading comments…
        </div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center glass rounded-2xl border border-[var(--border-color)] text-sm text-[var(--text-secondary)]">
          No comments yet. Be the first to share your thoughts!
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((comment) => {
            const isTranslated = !!translations[comment.id];
            const isReported = reportedIds.has(comment.id) || comment.reportStatus === 'PENDING_REVIEW';
            const userPlan = comment.user?.planType || 'FREE';
            const badge = planBadges[userPlan] || planBadges.FREE;

            return (
              <div
                key={comment.id}
                id={`comment-item-${comment.id}`}
                className="p-4 rounded-2xl glass border border-[var(--border-color)] hover:border-[var(--brand)]/30 transition-all flex flex-col gap-2.5"
              >
                {/* Author Info & Location */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="w-8 h-8 rounded-full bg-[var(--brand)]/20 border border-[var(--brand)]/40 flex items-center justify-center font-bold text-xs text-[var(--brand)]">
                      {(comment.user?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">
                          {comment.user?.name || 'User'}
                        </span>
                        {/* Plan Tier Badge */}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] mt-0.5">
                        <span>{formatTimeAgo(comment.createdAt)}</span>
                        {/* Optional location badge (broad region only, never exact) */}
                        {comment.locationRegion && (
                          <>
                            <span>•</span>
                            <span className="text-[var(--brand)] font-medium">
                              📍 {comment.locationRegion}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Flagged / Reported Notice */}
                  {isReported && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      ⚠️ Under Review
                    </span>
                  )}
                </div>

                {/* Comment Text */}
                <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap pl-10">
                  {comment.text}
                </p>

                {/* Translated Box */}
                {isTranslated && (
                  <div className="ml-10 p-3 rounded-xl bg-[var(--brand)]/10 border border-[var(--brand)]/20 text-xs text-[var(--text-primary)]">
                    <div className="flex items-center justify-between text-[10px] text-[var(--brand)] font-bold uppercase tracking-wider mb-1">
                      <span>🌐 Translated to {SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)?.label}</span>
                      <button
                        onClick={() => handleTranslate(comment.id)}
                        className="hover:underline text-[var(--text-secondary)]"
                      >
                        Hide
                      </button>
                    </div>
                    <p className="leading-relaxed">{translations[comment.id]}</p>
                  </div>
                )}

                {/* Actions: Translate, Like, Dislike, Report */}
                <div className="flex items-center justify-between gap-4 pt-1 pl-10 text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center gap-4">
                    {/* Translate Button */}
                    <button
                      id={`comment-translate-btn-${comment.id}`}
                      onClick={() => handleTranslate(comment.id)}
                      disabled={translatingId === comment.id}
                      className="inline-flex items-center gap-1 hover:text-[var(--brand)] transition-colors font-medium"
                    >
                      <span>🌐</span>
                      <span>
                        {translatingId === comment.id
                          ? 'Translating…'
                          : isTranslated
                          ? 'Show Original'
                          : 'Translate'}
                      </span>
                    </button>

                    {/* Like Button */}
                    <button
                      id={`comment-like-btn-${comment.id}`}
                      onClick={() => handleLike(comment.id)}
                      className={`inline-flex items-center gap-1.5 transition-colors ${
                        likedIds.has(comment.id) ? 'text-[var(--brand)] font-bold' : 'hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span>👍</span>
                      <span>{comment.likes}</span>
                    </button>

                    {/* Dislike Button */}
                    <button
                      id={`comment-dislike-btn-${comment.id}`}
                      onClick={() => handleDislike(comment.id)}
                      className={`inline-flex items-center gap-1.5 transition-colors ${
                        dislikedIds.has(comment.id) ? 'text-red-400 font-bold' : 'hover:text-[var(--text-primary)]'
                      }`}
                      title="Dislike this comment"
                    >
                      <span>👎</span>
                      <span>{comment.dislikes}</span>
                    </button>
                  </div>

                  {/* Report Button */}
                  <button
                    id={`comment-report-btn-${comment.id}`}
                    onClick={() => setReportingCommentId(comment.id)}
                    disabled={isReported}
                    className={`inline-flex items-center gap-1 hover:text-red-400 transition-colors text-[11px] ${
                      isReported ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <span>🚩</span>
                    <span>{isReported ? 'Reported' : 'Report'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Comment Modal */}
      {reportingCommentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass rounded-2xl p-6 border border-[var(--border-color)] max-w-md w-full bg-[var(--bg-primary)] shadow-2xl">
            <h4 className="font-display font-bold text-base text-[var(--text-primary)] mb-2">
              🚩 Report Comment
            </h4>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Reported comments are flagged for administrator review instead of being deleted.
            </p>

            <div className="flex flex-col gap-2 mb-5">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    reportReason === reason
                      ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--text-primary)] font-semibold'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={() => setReportReason(reason)}
                    className="text-[var(--brand)]"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setReportingCommentId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={submitReport}
                isLoading={isReporting}
              >
                Submit Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
