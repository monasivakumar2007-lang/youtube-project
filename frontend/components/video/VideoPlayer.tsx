'use client';

// ============================================================
// components/video/VideoPlayer.tsx
// Custom HTML5 Video Player with HTTP 206 streaming,
// mobile double-tap seek, keyboard controls, view tracking & up-next
// ============================================================

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  MouseEvent,
  TouchEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Video } from '@/types';
import {
  getVideoStreamUrl,
  formatDuration,
  recordView,
  resolveThumbnailUrl,
} from '@/lib/videoApi';
import { useAuth } from '@/context/AuthContext';

interface VideoPlayerProps {
  video: Video;
  nextVideo?: Video | null;
  onEnded?: () => void;
}

export default function VideoPlayer({ video, nextVideo, onEnded }: VideoPlayerProps) {
  const router = useRouter();
  const { token } = useAuth();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const viewCountRecordedRef = useRef<boolean>(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Touch double-tap tracking
  const lastTouchTimeRef = useRef<{ left: number; right: number }>({ left: 0, right: 0 });
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Player State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(video.duration || 0);
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isDraggingProgress, setIsDraggingProgress] = useState<boolean>(false);

  // Visual double-tap indicators ('left' | 'right' | null)
  const [seekFeedback, setSeekFeedback] = useState<'left' | 'right' | null>(null);

  // Up Next overlay visibility
  const [showUpNextOverlay, setShowUpNextOverlay] = useState<boolean>(false);
  const [isUpNextDismissed, setIsUpNextDismissed] = useState<boolean>(false);

  // Stream URL with token authentication
  const streamUrl = getVideoStreamUrl(video.id, token);

  // ─── Controls Visibility Timer ──────────────────────────────
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    // Only auto-hide if playing and not hovering on progress dragging
    if (isPlaying && !isDraggingProgress) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, isDraggingProgress]);

  // ─── Record View (Once per watch session) ───────────────────
  const triggerViewCount = useCallback(() => {
    if (!viewCountRecordedRef.current && video.id) {
      viewCountRecordedRef.current = true;
      recordView(video.id).catch((err) => {
        console.warn('Failed to record video view:', err);
      });
    }
  }, [video.id]);

  // Reset view counter flag when video id changes
  useEffect(() => {
    viewCountRecordedRef.current = false;
    setIsUpNextDismissed(false);
    setShowUpNextOverlay(false);
  }, [video.id]);

  // ─── Play / Pause Toggle ────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    if (v.paused || v.ended) {
      v.play()
        .then(() => {
          setIsPlaying(true);
          triggerViewCount();
        })
        .catch((err) => {
          console.warn('Autoplay/playback error:', err);
        });
    } else {
      v.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  }, [triggerViewCount]);

  // ─── Seek By Offset (±10s) ──────────────────────────────────
  const seekRelative = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;

    const target = Math.max(0, Math.min(v.duration || duration, v.currentTime + seconds));
    v.currentTime = target;
    setCurrentTime(target);

    // Show indicator
    setSeekFeedback(seconds < 0 ? 'left' : 'right');
    setTimeout(() => setSeekFeedback(null), 700);

    resetControlsTimeout();
  }, [duration, resetControlsTimeout]);

  // ─── Fullscreen Toggle ──────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    const elem = containerRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen?.().catch((err) => console.warn('Fullscreen error:', err));
    } else {
      document.exitFullscreen?.().catch((err) => console.warn('Exit fullscreen error:', err));
    }
  }, []);

  // Listen to fullscreenchange
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // ─── Volume and Mute Toggle ─────────────────────────────────
  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    if (isMuted) {
      v.muted = false;
      setIsMuted(false);
      v.volume = volume > 0 ? volume : 1;
      setVolume(v.volume);
    } else {
      v.muted = true;
      setIsMuted(true);
    }
    resetControlsTimeout();
  }, [isMuted, volume, resetControlsTimeout]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    const v = videoRef.current;
    if (!v) return;

    v.volume = newVol;
    setVolume(newVol);
    if (newVol === 0) {
      v.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      v.muted = false;
      setIsMuted(false);
    }
    resetControlsTimeout();
  };

  // ─── Progress Bar Seek ──────────────────────────────────────
  const seekToPercent = (percent: number) => {
    const v = videoRef.current;
    if (!v || !duration) return;

    const clamped = Math.max(0, Math.min(1, percent));
    const targetTime = clamped * duration;
    v.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleProgressClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    seekToPercent(percent);
    resetControlsTimeout();
  };

  // ─── Progress Dragging Handler ──────────────────────────────
  useEffect(() => {
    if (!isDraggingProgress) return;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const track = progressTrackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percent = clickX / rect.width;
      seekToPercent(percent);
    };

    const handleMouseUp = () => {
      setIsDraggingProgress(false);
      resetControlsTimeout();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingProgress, duration, resetControlsTimeout]);

  // ─── Video HTML5 Event Handlers ─────────────────────────────
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;

    const cur = v.currentTime;
    setCurrentTime(cur);

    // Buffer percentage
    if (v.buffered.length > 0 && v.duration > 0) {
      const bufferedEnd = v.buffered.end(v.buffered.length - 1);
      setBufferedPercent((bufferedEnd / v.duration) * 100);
    }

    // Trigger view count once playback reaches > 1s
    if (cur > 1) {
      triggerViewCount();
    }

    // Check Up Next Overlay in the last 10 seconds of video
    const totalDur = v.duration || duration;
    if (totalDur > 12 && totalDur - cur <= 10) {
      if (!isUpNextDismissed && nextVideo) {
        setShowUpNextOverlay(true);
      }
    } else if (showUpNextOverlay && totalDur - cur > 10) {
      setShowUpNextOverlay(false);
    }
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.duration && !isNaN(v.duration)) {
      setDuration(v.duration);
    }
    setIsBuffering(false);
    setHasError(false);
  };

  const handleWaiting = () => setIsBuffering(true);
  const handlePlaying = () => {
    setIsBuffering(false);
    setIsPlaying(true);
  };
  const handlePause = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
    if (nextVideo && !isUpNextDismissed) {
      setShowUpNextOverlay(true);
    }
    if (onEnded) onEnded();
  };

  const handleError = () => {
    setIsBuffering(false);
    setHasError(true);
    setErrorMessage('Failed to load video stream. The video may still be processing or unavailable.');
  };

  // ─── Mobile Double-Tap Handler ──────────────────────────────
  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>, side: 'left' | 'right') => {
    const now = Date.now();
    const lastTime = lastTouchTimeRef.current[side];
    const diff = now - lastTime;

    if (diff < 320 && diff > 40) {
      // Double tap confirmed on this side!
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      lastTouchTimeRef.current[side] = 0;
      seekRelative(side === 'left' ? -10 : 10);
    } else {
      // First tap: set timer
      lastTouchTimeRef.current[side] = now;
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      touchTimerRef.current = setTimeout(() => {
        // Single tap behavior: toggle controls
        setShowControls((prev) => !prev);
      }, 320);
    }
  };

  // ─── Keyboard Shortcuts ─────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(10);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seekRelative, toggleMute, toggleFullscreen]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      id="streamvault-player-container"
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden select-none group shadow-2xl border border-[var(--border-color)]/40 focus:outline-none"
      tabIndex={0}
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        id="streamvault-html5-video"
        src={streamUrl}
        preload="metadata"
        playsInline
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Mobile Double-tap Touch Zones (Left & Right halves) */}
      <div className="absolute inset-0 flex sm:hidden pointer-events-auto z-10">
        <div
          id="player-touch-zone-left"
          className="w-1/2 h-full"
          onTouchEnd={(e) => handleTouchEnd(e, 'left')}
        />
        <div
          id="player-touch-zone-right"
          className="w-1/2 h-full"
          onTouchEnd={(e) => handleTouchEnd(e, 'right')}
        />
      </div>

      {/* Visual Feedback for Double-Tap Seek */}
      {seekFeedback === 'left' && (
        <div className="absolute left-10 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center p-4 rounded-full bg-black/75 text-white animate-scale-in pointer-events-none">
          <span className="text-3xl font-bold">↶ 10s</span>
          <span className="text-xs text-gray-300">Rewind</span>
        </div>
      )}
      {seekFeedback === 'right' && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center p-4 rounded-full bg-black/75 text-white animate-scale-in pointer-events-none">
          <span className="text-3xl font-bold">10s ↷</span>
          <span className="text-xs text-gray-300">Forward</span>
        </div>
      )}

      {/* Buffering Spinner */}
      {isBuffering && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-20 pointer-events-none">
          <div className="w-14 h-14 border-4 border-white/20 border-t-[var(--brand)] rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-white/90 drop-shadow">Loading video…</p>
        </div>
      )}

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-30 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h4 className="text-white font-semibold text-base mb-1">Playback Unavailable</h4>
          <p className="text-xs text-gray-400 max-w-sm mb-4">{errorMessage}</p>
          <button
            onClick={() => {
              setHasError(false);
              setIsBuffering(true);
              if (videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(() => {});
              }
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--brand)] text-white hover:brightness-110 transition-all"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Up Next Overlay (Final 10 seconds or Ended) */}
      {showUpNextOverlay && nextVideo && (
        <div className="absolute top-4 right-4 z-25 max-w-xs sm:max-w-sm rounded-2xl glass bg-black/80 border border-white/20 p-4 shadow-2xl animate-fade-in backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs uppercase font-bold text-[var(--brand)] tracking-wider">
              Up Next
            </span>
            <button
              onClick={() => {
                setShowUpNextOverlay(false);
                setIsUpNextDismissed(true);
              }}
              title="Dismiss"
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-black/50 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveThumbnailUrl(nextVideo.thumbnailUrl)}
                alt={nextVideo.title}
                className="w-full h-full object-cover"
              />
              {nextVideo.duration > 0 && (
                <span className="absolute bottom-1 right-1 px-1 rounded text-[9px] bg-black/80 text-white font-mono">
                  {formatDuration(nextVideo.duration)}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h5 className="text-white font-semibold text-xs line-clamp-2 mb-2">
                {nextVideo.title}
              </h5>
              <button
                onClick={() => router.push(`/watch/${nextVideo.id}`)}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-[var(--brand)] text-white hover:brightness-110 transition-all shadow"
              >
                Watch Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Center Big Play Button (when paused, desktop) */}
      {!isPlaying && !isBuffering && !hasError && (
        <button
          onClick={togglePlay}
          aria-label="Play video"
          className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--brand)]/90 hover:bg-[var(--brand)] text-white flex items-center justify-center shadow-2xl transition-all transform hover:scale-105 z-20 pointer-events-auto"
        >
          <svg className="w-8 h-8 sm:w-10 sm:h-10 fill-current translate-x-1" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}

      {/* Controls Overlay Container */}
      <div
        className={`absolute inset-0 pointer-events-none flex flex-col justify-end transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Gradient backdrop for bottom controls */}
        <div className="w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 px-3 pb-3 sm:px-4 sm:pb-4 pointer-events-auto">
          {/* Progress Bar Container */}
          <div
            ref={progressTrackRef}
            id="player-progress-track"
            onClick={handleProgressClick}
            onMouseDown={() => setIsDraggingProgress(true)}
            className="group/track relative w-full h-1.5 hover:h-3 transition-all cursor-pointer rounded-full bg-white/20 mb-3"
          >
            {/* Buffered Progress */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-white/30 transition-all"
              style={{ width: `${bufferedPercent}%` }}
            />
            {/* Playback Progress */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-[var(--brand)] transition-all flex items-center justify-end"
              style={{ width: `${progressPercent}%` }}
            >
              {/* Scrub Thumb */}
              <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md transform scale-0 group-hover/track:scale-100 transition-transform" />
            </div>
          </div>

          {/* Control Buttons & Sliders */}
          <div className="flex items-center justify-between gap-3 text-white">
            {/* Left Controls: Play/Pause, Seek 10s, Volume, Time */}
            <div className="flex items-center gap-2 sm:gap-3.5">
              {/* Play / Pause Button */}
              <button
                id="player-play-btn"
                onClick={togglePlay}
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                {isPlaying ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Seek -10s */}
              <button
                id="player-seek-back-btn"
                onClick={() => seekRelative(-10)}
                title="Rewind 10 seconds (←)"
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center text-xs font-bold"
              >
                <span className="flex items-center gap-0.5">
                  <span className="text-sm">↶</span>10
                </span>
              </button>

              {/* Seek +10s */}
              <button
                id="player-seek-fwd-btn"
                onClick={() => seekRelative(10)}
                title="Forward 10 seconds (→)"
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center text-xs font-bold"
              >
                <span className="flex items-center gap-0.5">
                  10<span className="text-sm">↷</span>
                </span>
              </button>

              {/* Volume & Mute */}
              <div className="flex items-center gap-1.5 group/vol">
                <button
                  id="player-mute-btn"
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                  className="p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : volume < 0.5 ? (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M7 9v6h4l5 5V4l-5 5H7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>

                <input
                  id="player-volume-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  aria-label="Volume slider"
                  className="w-14 sm:w-20 h-1 accent-[var(--brand)] cursor-pointer hidden sm:inline-block"
                />
              </div>

              {/* Time Display */}
              <div className="text-xs sm:text-sm font-mono text-gray-300">
                <span>{formatDuration(currentTime)}</span>
                <span className="mx-1 text-gray-500">/</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Fullscreen */}
            <div className="flex items-center gap-2">
              <button
                id="player-fullscreen-btn"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                {isFullscreen ? (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
