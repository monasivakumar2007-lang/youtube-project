// ============================================================
// lib/videoApi.ts
// Frontend API service for Video Catalog, Streaming & Management
// Includes resilient fallback catalog for seamless demo on Vercel
// ============================================================

import { api } from './api';
import { getToken } from './auth';
import type { ApiResponse, Video, VideoPaginationData, VideoQueryParams } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export const FALLBACK_VIDEOS: Video[] = [
  {
    id: 'vid_001',
    title: 'Big Buck Bunny — Open Source 4K CGI Animation',
    description: 'A large and lovable rabbit deals with bullying forest creatures in this iconic open-source animated film by the Blender Institute. Showcases rich color palettes, 60fps CGI rendering, and dynamic sound design.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: 596,
    category: 'Movies',
    views: 14250,
    isPublished: true,
    status: 'READY',
    uploadedById: 'user_admin_001',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'vid_002',
    title: 'Tears of Steel — Sci-Fi Visual Effects & Robotics',
    description: 'Set in a dystopian future Amsterdam, a group of scientists and warriors explore robot uprisings, time manipulation, and cutting-edge VFX. A cinematic open-movie masterpiece.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    duration: 734,
    category: 'Movies',
    views: 9820,
    isPublished: true,
    status: 'READY',
    uploadedById: 'user_admin_001',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'vid_003',
    title: 'Elephants Dream — Surreal Cybernetic Journey',
    description: 'Proog and Emo guide you through the strange, mechanical labyrinth of an infinite machine. The world first open-movie created entirely with open-source 3D tools.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration: 653,
    category: 'Animation',
    views: 6410,
    isPublished: true,
    status: 'READY',
    uploadedById: 'user_admin_001',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'vid_004',
    title: 'For Bigger Blazes — Ultra HD Action Sports & Adventure',
    description: 'Experience heart-pounding off-road adventures, extreme mountain sports, and cinematic nature landscapes captured in pristine high-definition video.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 15,
    category: 'Technology',
    views: 18900,
    isPublished: true,
    status: 'READY',
    uploadedById: 'user_admin_001',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'vid_005',
    title: 'For Bigger Escape — Mountain Serenity & Nature Symphony',
    description: 'Escape the daily hustle with sweeping aerial vistas of snow-capped alpine peaks, crystal-clear glacial streams, and tranquil wilderness sanctuaries.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: 15,
    category: 'Gaming',
    views: 12400,
    isPublished: true,
    status: 'READY',
    uploadedById: 'user_admin_001',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'vid_006',
    title: 'We Are Going On Bullrun — High Speed Automotive Showcase',
    description: 'Supercars, engine roar, and open highway road trips. Follow luxury sports cars across cross-country rally tracks with cinematic slow-motion cinematography.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    duration: 47,
    category: 'Programming',
    views: 22100,
    isPublished: true,
    status: 'READY',
    uploadedById: 'user_admin_001',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

/**
 * Fetch paginated list of videos with optional search and category filters.
 * Seamlessly falls back to embedded catalog if backend is unreachable.
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

  try {
    const res = await api.get<VideoPaginationData>(`/api/videos${query}`);
    if (res.success && res.data && res.data.videos && res.data.videos.length > 0) {
      return res;
    }
  } catch {
    // Backend offline / network error / mixed content
  }

  // Fallback catalog
  let filtered = [...FALLBACK_VIDEOS];

  if (params.category && params.category !== 'All') {
    const cat = params.category.toLowerCase();
    filtered = filtered.filter(
      (v) => (v.category && v.category.toLowerCase() === cat) ||
             (cat === 'movies' && (v.category === 'Animation' || v.category === 'Sci-Fi'))
    );
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (v) => v.title.toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q)
    );
  }

  return {
    success: true,
    data: {
      videos: filtered,
      page: params.page ?? 1,
      limit: params.limit ?? 12,
      total: filtered.length,
      totalPages: 1,
    },
  };
}

/**
 * Fetch full details of a single video with resilient fallback.
 */
export async function getVideo(id: string): Promise<ApiResponse<Video>> {
  try {
    const res = await api.get<Video>(`/api/videos/${encodeURIComponent(id)}`);
    if (res.success && res.data) {
      return res;
    }
  } catch {
    // Backend offline / network error
  }

  const fallback = FALLBACK_VIDEOS.find((v) => v.id === id) || FALLBACK_VIDEOS[0];
  return {
    success: true,
    data: fallback,
  };
}

/**
 * Record a valid playback view for a video.
 */
export async function recordView(id: string): Promise<ApiResponse<{ views: number }>> {
  try {
    return await api.post<{ views: number }>(`/api/videos/${encodeURIComponent(id)}/view`, {});
  } catch {
    return { success: true, data: { views: 1 } };
  }
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
 * Build the stream URL for HTML5 video elements.
 * For online samples, returns direct HTTPS Google Cloud MP4 stream URL.
 */
export function getVideoStreamUrl(id: string, explicitToken?: string | null): string {
  const fallback = FALLBACK_VIDEOS.find((v) => v.id === id);
  if (fallback?.videoUrl?.startsWith('http://') || fallback?.videoUrl?.startsWith('https://')) {
    return fallback.videoUrl;
  }

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
