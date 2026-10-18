// ============================================================
// lib/commentApi.ts
// Comment API service — Task 6
// ============================================================

import { api } from './api';
import type { ApiResponse } from '@/types';

export interface CommentUser {
  id: string;
  name: string;
  planType: 'FREE' | 'BRONZE' | 'SILVER' | 'GOLD';
  role: 'USER' | 'ADMIN';
}

export interface CommentItem {
  id: string;
  userId: string;
  videoId: string;
  text: string;
  language: string | null;
  translatedText?: string | null;
  locationRegion?: string | null;
  isFlagged: boolean;
  moderationReason?: string | null;
  reportStatus: 'NONE' | 'PENDING_REVIEW' | 'REVIEWED' | 'RESOLVED';
  likes: number;
  dislikes: number;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
  video?: { id: string; title: string } | null;
}

const DEFAULT_COMMENTS: CommentItem[] = [
  {
    id: 'comm_001',
    userId: 'user_001',
    videoId: 'vid_001',
    text: 'This animation quality is truly breathtaking! Amazing open-source project.',
    language: 'English',
    translatedText: null,
    locationRegion: 'California, US',
    isFlagged: false,
    reportStatus: 'NONE',
    likes: 42,
    dislikes: 1,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    user: { id: 'u1', name: 'Alex Rivera', planType: 'GOLD', role: 'USER' },
  },
  {
    id: 'comm_002',
    userId: 'user_002',
    videoId: 'vid_001',
    text: 'यह वीडियो बहुत ही शानदार और प्रेरणादायक है!',
    language: 'Hindi',
    translatedText: 'This video is very wonderful and inspiring!',
    locationRegion: 'Delhi, India',
    isFlagged: false,
    reportStatus: 'NONE',
    likes: 29,
    dislikes: 0,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    user: { id: 'u2', name: 'Priya Sharma', planType: 'BRONZE', role: 'USER' },
  },
  {
    id: 'comm_003',
    userId: 'user_003',
    videoId: 'vid_001',
    text: 'C\'est vraiment un chef-d\'œuvre cinématographique.',
    language: 'French',
    translatedText: 'This is truly a cinematographic masterpiece.',
    locationRegion: 'Paris, France',
    isFlagged: false,
    reportStatus: 'NONE',
    likes: 18,
    dislikes: 0,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    updatedAt: new Date(Date.now() - 14400000).toISOString(),
    user: { id: 'u3', name: 'Jean Dupont', planType: 'SILVER', role: 'USER' },
  },
];

export async function getVideoComments(videoId: string): Promise<ApiResponse<CommentItem[]>> {
  try {
    const res = await api.get<CommentItem[]>(`/api/videos/${encodeURIComponent(videoId)}/comments`);
    if (res.success && res.data && res.data.length > 0) {
      return res;
    }
  } catch {
    // Backend offline / Vercel demo
  }
  return {
    success: true,
    data: DEFAULT_COMMENTS,
  };
}

export async function postComment(
  videoId: string,
  text: string,
  shareLocation: boolean = false
): Promise<ApiResponse<CommentItem>> {
  return api.post<CommentItem>(`/api/videos/${encodeURIComponent(videoId)}/comments`, {
    text,
    shareLocation,
  });
}

export async function translateCommentText(
  commentId: string,
  targetLanguage: string
): Promise<ApiResponse<{ id: string; originalText: string; translatedText: string; targetLanguage: string }>> {
  return api.post<{ id: string; originalText: string; translatedText: string; targetLanguage: string }>(
    `/api/comments/${encodeURIComponent(commentId)}/translate`,
    { targetLanguage }
  );
}

export async function likeComment(
  commentId: string
): Promise<ApiResponse<{ likes: number; dislikes: number }>> {
  return api.post<{ likes: number; dislikes: number }>(`/api/comments/${encodeURIComponent(commentId)}/like`, {});
}

export async function dislikeComment(
  commentId: string
): Promise<ApiResponse<{ likes: number; dislikes: number }>> {
  return api.post<{ likes: number; dislikes: number }>(`/api/comments/${encodeURIComponent(commentId)}/dislike`, {});
}

export async function reportComment(
  commentId: string,
  reason: string
): Promise<ApiResponse<CommentItem>> {
  return api.post<CommentItem>(`/api/comments/${encodeURIComponent(commentId)}/report`, { reason });
}

export async function getFlaggedComments(): Promise<ApiResponse<CommentItem[]>> {
  return api.get<CommentItem[]>('/api/admin/flagged-comments');
}
