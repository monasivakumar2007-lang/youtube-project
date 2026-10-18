// ============================================================
// lib/videoApi.ts
// Frontend API service for Video Catalog, Streaming & Management
// ============================================================

import { api } from './api';
import { getToken } from './auth';
import type { ApiResponse, Video, VideoPaginationData, VideoQueryParams } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

/**
 * Fetch paginated list of videos with optional search and category filters.
 */
export async function getVideos(
  params: VideoQueryParams = {}
): Promise<ApiResponse<VideoPaginationData>> {
  const queryParts: string[] = [];
  if (params.page) queryParts.push(`page=${encodeURIComponent(params.page)}`);
  if (params.limit) queryParts.push(`limit=${encodeURIComponent(params.limit)}`);
  if (params.search && params.search.trim()) {
    queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
  }
  if (params.category && params.category !== 'All') {
    queryParts.push(`category=${encodeURIComponent(params.category)}`);
  }
  if (params.status) {
    queryParts.push(`status=${encodeURIComponent(params.status)}`);
  }

  const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return api.get<VideoPaginationData>(`/api/videos${query}`);
}

/**
 * Fetch full details of a single video.
 */
export async function getVideo(id: string): Promise<ApiResponse<Video>> {
  return api.get<Video>(`/api/videos/${encodeURIComponent(id)}`);
}

/**
 * Record a valid playback view for a video.
 */
export async function recordView(id: string): Promise<ApiResponse<{ views: number }>> {
  return api.post<{ views: number }>(`/api/videos/${encodeURIComponent(id)}/view`, {});
}

/**
 * Upload a new video (multipart FormData containing 'video' and 'thumbnail').
 */
export async function uploadVideo(formData: FormData): Promise<ApiResponse<Video>> {
  return api.post<Video>('/api/videos', formData);
}

/**
 * Update video metadata (title, description, category, isPublished).
 */
export async function updateVideo(
  id: string,
  data: Partial<Video> | FormData
): Promise<ApiResponse<Video>> {
  return api.put<Video>(`/api/videos/${encodeURIComponent(id)}`, data);
}

/**
 * Delete a video and remove its files.
 */
export async function deleteVideo(id: string): Promise<ApiResponse<{ id: string }>> {
  return api.delete<{ id: string }>(`/api/videos/${encodeURIComponent(id)}`);
}

/**
 * Build the authenticated stream URL for HTML5 video elements.
 */
export function getVideoStreamUrl(id: string, explicitToken?: string | null): string {
  const token = explicitToken ?? getToken();
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${BASE_URL}/api/videos/${encodeURIComponent(id)}/stream${tokenParam}`;
}

/**
 * Format duration in seconds to standard MM:SS or HH:MM:SS.
 */
export function formatDuration(seconds: number | undefined | null): string {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds < 0) {
    return '--:--';
  }

  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Resolve full thumbnail URL (handling local uploads and external URLs).
 */
export function resolveThumbnailUrl(pathOrUrl: string | undefined | null): string {
  if (!pathOrUrl || pathOrUrl.includes('placeholder.png')) {
    return '/placeholders/video-thumb-placeholder.svg';
  }
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  // Local backend upload path e.g. /uploads/thumbnails/...
  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${BASE_URL}${cleanPath}`;
}
