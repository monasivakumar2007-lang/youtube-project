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

export async function getVideoComments(videoId: string): Promise<ApiResponse<CommentItem[]>> {
  return api.get<CommentItem[]>(`/api/videos/${encodeURIComponent(videoId)}/comments`);
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
