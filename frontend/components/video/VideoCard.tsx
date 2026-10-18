'use client';

// ============================================================
// components/video/VideoCard.tsx
// Reusable Video Card component with hover effect & metadata
// ============================================================

import { useState } from 'react';
import Link from 'next/link';
import type { Video } from '@/types';
import { formatDuration, resolveThumbnailUrl } from '@/lib/videoApi';

interface VideoCardProps {
  video: Video;
  priority?: boolean;
}

export default function VideoCard({ video }: VideoCardProps) {
  const [imgError, setImgError] = useState(false);
  const thumbnailUrl = imgError
    ? '/placeholders/video-thumb-placeholder.svg'
    : resolveThumbnailUrl(video.thumbnailUrl);

  const uploaderName = video.uploadedBy?.name || 'Creator';
  const viewsText =
    video.views === 1 ? '1 view' : `${(video.views || 0).toLocaleString()} views`;

  // Format relative or date string
  const formattedDate = (() => {
    try {
      const date = new Date(video.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays}d ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
      return `${Math.floor(diffDays / 365)}y ago`;
    } catch {
      return '';
    }
  })();

  return (
    <Link
      href={`/watch/${video.id}`}
      id={`video-card-${video.id}`}
      className="group flex flex-col rounded-2xl overflow-hidden glass border border-[var(--border-color)] hover:border-[var(--brand)]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--brand)]/10 hover:-translate-y-1 bg-[var(--bg-secondary)]"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt={video.title}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Hover play icon overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-[var(--brand)]/90 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <svg className="w-6 h-6 fill-current translate-x-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Duration badge */}
        {video.duration > 0 && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-xs font-semibold bg-black/80 text-white backdrop-blur-sm shadow">
            {formatDuration(video.duration)}
          </span>
        )}

        {/* Category tag */}
        {video.category && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--brand)]/90 text-white backdrop-blur-sm shadow-sm">
            {video.category}
          </span>
        )}
      </div>

      {/* Video Details */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3
            className="font-display font-semibold text-base text-[var(--text-primary)] line-clamp-2 leading-snug group-hover:text-[var(--brand)] transition-colors"
            title={video.title}
          >
            {video.title}
          </h3>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1 border-t border-[var(--border-color)]/60">
          <div className="flex items-center gap-1.5 truncate max-w-[60%]">
            <span className="w-5 h-5 rounded-full bg-[var(--brand)]/20 text-[var(--brand)] flex items-center justify-center text-[10px] font-bold">
              {uploaderName.charAt(0).toUpperCase()}
            </span>
            <span className="truncate font-medium">{uploaderName}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] flex-shrink-0">
            <span>{viewsText}</span>
            {formattedDate && (
              <>
                <span>•</span>
                <span>{formattedDate}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
