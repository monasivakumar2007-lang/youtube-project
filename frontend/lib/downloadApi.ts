// ============================================================
// lib/downloadApi.ts
// Download API service — Task 2
// ============================================================

import { api } from './api';
import type { ApiResponse, Video } from '@/types';

export interface DownloadQuota {
  plan: 'FREE' | 'BRONZE' | 'SILVER' | 'GOLD';
  dailyLimit: number | 'Unlimited';
  usedToday: number;
  remainingToday: number | 'Unlimited';
  canDownload: boolean;
}

export interface DownloadRecord {
  id: string;
  userId: string;
  videoId: string;
  planType: string;
  downloadedAt: string;
  video: Video;
}

export interface DownloadHistoryResponse {
  downloads: DownloadRecord[];
  quota: DownloadQuota;
}

export interface TriggerDownloadResponse {
  download: DownloadRecord;
  downloadUrl: string;
  quota: DownloadQuota;
}

export async function getUserDownloads(): Promise<ApiResponse<DownloadHistoryResponse>> {
  return api.get<DownloadHistoryResponse>('/api/downloads');
}

export async function requestVideoDownload(videoId: string): Promise<ApiResponse<TriggerDownloadResponse>> {
  return api.post<TriggerDownloadResponse>(`/api/downloads/${encodeURIComponent(videoId)}`, {});
}
