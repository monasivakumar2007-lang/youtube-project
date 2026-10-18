'use client';

// ============================================================
// app/videos/upload/page.tsx
// Video Upload Page with Drag-and-Drop, Validation & Upload Progress
// ============================================================

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { uploadVideo } from '@/lib/videoApi';
import { VIDEO_CATEGORIES } from '@/types';

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALLOWED_VIDEO_EXTS = ['.mp4', '.webm'];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

export default function VideoUploadPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Technology');
  const [description, setDescription] = useState('');

  // File State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreviewUrl, setThumbPreviewUrl] = useState<string | null>(null);

  // Drag States
  const [isVideoDragging, setIsVideoDragging] = useState(false);
  const [isThumbDragging, setIsThumbDragging] = useState(false);

  // Status & Error
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Refs for hidden file inputs
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login?redirect=/videos/upload');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Clean up thumbnail preview object URL on unmount or change
  useEffect(() => {
    return () => {
      if (thumbPreviewUrl) URL.revokeObjectURL(thumbPreviewUrl);
    };
  }, [thumbPreviewUrl]);

  // ─── File Validation Helpers ────────────────────────────────
  const validateVideoFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_VIDEO_TYPES.includes(file.type) && !ALLOWED_VIDEO_EXTS.includes(ext)) {
      return 'Please choose a valid video format (.mp4 or .webm).';
    }
    if (file.size > 300 * 1024 * 1024) {
      return 'Video file exceeds the 300MB maximum size limit.';
    }
    return null;
  };

  const validateThumbFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !ALLOWED_IMAGE_EXTS.includes(ext)) {
      return 'Please select a valid image format (.jpg, .jpeg, .png, or .webp).';
    }
    if (file.size > 15 * 1024 * 1024) {
      return 'Thumbnail file exceeds the 15MB limit.';
    }
    return null;
  };

  // ─── Video File Pick / Drop ─────────────────────────────────
  const handleVideoSelect = (file: File) => {
    const err = validateVideoFile(file);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setVideoFile(file);
  };

  const handleVideoDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsVideoDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleVideoSelect(e.dataTransfer.files[0]);
    }
  };

  // ─── Thumbnail Pick / Drop ──────────────────────────────────
  const handleThumbSelect = (file: File) => {
    const err = validateThumbFile(file);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setThumbFile(file);
    if (thumbPreviewUrl) URL.revokeObjectURL(thumbPreviewUrl);
    setThumbPreviewUrl(URL.createObjectURL(file));
  };

  const handleThumbDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsThumbDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleThumbSelect(e.dataTransfer.files[0]);
    }
  };

  // ─── Form Submission Handler ────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Video title is required.');
      return;
    }

    if (!category) {
      setFormError('Please select a valid category for your video.');
      return;
    }

    if (!videoFile) {
      setFormError('Please select a video file to upload.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category', category);
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      formData.append('video', videoFile);
      if (thumbFile) {
        formData.append('thumbnail', thumbFile);
      }

      const res = await uploadVideo(formData);

      if (res.success && res.data) {
        setSuccessMessage('Video uploaded successfully! Redirecting…');
        const newVideoId = res.data.id;
        setTimeout(() => {
          router.push(`/watch/${newVideoId}`);
        }, 1200);
      } else {
        setFormError(res.message || 'Failed to upload video. Please try again.');
        setIsUploading(false);
      }
    } catch {
      setFormError('Network error while uploading video. Please try again.');
      setIsUploading(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[var(--border-color)] border-t-[var(--brand)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-8">
          <Link
            href="/videos"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-3"
          >
            ← Back to Videos
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
            Upload Video
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Publish your content to StreamVault. Supported video formats: MP4, WebM (up to 300MB).
          </p>
        </div>

        {/* Feedback Banners */}
        {formError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3 animate-fade-in">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formError}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-3 animate-fade-in">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Metadata Section */}
          <div className="glass rounded-2xl p-6 sm:p-8 border border-[var(--border-color)] space-y-5">
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              Video Information
            </h2>

            {/* Title */}
            <Input
              id="upload-video-title"
              label="Video Title *"
              placeholder="e.g., Complete Guide to Modern Web Development"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isUploading}
              required
            />

            {/* Category Select */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="upload-video-category"
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                Category *
              </label>
              <select
                id="upload-video-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isUploading}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
              >
                {VIDEO_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="upload-video-description"
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                Description (Optional)
              </label>
              <textarea
                id="upload-video-description"
                rows={4}
                placeholder="What is this video about? Share details, timestamps, or links…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isUploading}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-200 bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] placeholder:text-[var(--text-secondary)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 resize-y"
              />
            </div>
          </div>

          {/* Files Section: Video & Thumbnail */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Video File Dropzone */}
            <div className="glass rounded-2xl p-6 border border-[var(--border-color)] flex flex-col justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-[var(--text-primary)] mb-1">
                  Video File *
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4">
                  Drag and drop or select your video (.mp4, .webm).
                </p>

                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm"
                  className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files && e.target.files[0]) {
                      handleVideoSelect(e.target.files[0]);
                    }
                  }}
                  disabled={isUploading}
                />

                <div
                  id="video-dropzone"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsVideoDragging(true);
                  }}
                  onDragLeave={() => setIsVideoDragging(false)}
                  onDrop={handleVideoDrop}
                  onClick={() => !isUploading && videoInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                    isVideoDragging
                      ? 'border-[var(--brand)] bg-[var(--brand)]/10 scale-[1.01]'
                      : videoFile
                      ? 'border-green-500/40 bg-green-500/5'
                      : 'border-[var(--border-color)] hover:border-[var(--brand)]/60 bg-[var(--bg-secondary)]/50'
                  }`}
                >
                  {videoFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                        ✓
                      </div>
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[220px]">
                        {videoFile.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                      <span className="text-[10px] text-[var(--brand)] font-semibold mt-1">
                        Click to change video
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center">
                        🎬
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        Drag video here
                      </p>
                      <span className="text-[11px] text-[var(--text-secondary)]">
                        or <span className="text-[var(--brand)] font-bold">Choose Video</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Thumbnail File Dropzone */}
            <div className="glass rounded-2xl p-6 border border-[var(--border-color)] flex flex-col justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-[var(--text-primary)] mb-1">
                  Thumbnail Image
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4">
                  Optional cover image (.jpg, .png, .webp).
                </p>

                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files && e.target.files[0]) {
                      handleThumbSelect(e.target.files[0]);
                    }
                  }}
                  disabled={isUploading}
                />

                <div
                  id="thumbnail-dropzone"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsThumbDragging(true);
                  }}
                  onDragLeave={() => setIsThumbDragging(false)}
                  onDrop={handleThumbDrop}
                  onClick={() => !isUploading && thumbInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] overflow-hidden ${
                    isThumbDragging
                      ? 'border-[var(--brand)] bg-[var(--brand)]/10 scale-[1.01]'
                      : thumbPreviewUrl
                      ? 'border-green-500/40 bg-green-500/5'
                      : 'border-[var(--border-color)] hover:border-[var(--brand)]/60 bg-[var(--bg-secondary)]/50'
                  }`}
                >
                  {thumbPreviewUrl ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden flex flex-col items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbPreviewUrl}
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 bg-black/75 px-2 py-0.5 rounded text-[10px] text-white">
                        Click to change image
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center">
                        🖼️
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        Drag thumbnail here
                      </p>
                      <span className="text-[11px] text-[var(--text-secondary)]">
                        or <span className="text-[var(--brand)] font-bold">Choose Image</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link href="/videos">
              <Button variant="ghost" disabled={isUploading}>
                Cancel
              </Button>
            </Link>
            <Button
              id="submit-upload-video-btn"
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isUploading}
            >
              {isUploading ? 'Uploading Video…' : 'Upload Video'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
