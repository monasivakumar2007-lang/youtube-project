// ============================================================
// lib/watchPartyApi.ts
// Watch Party API service — Task 1
// ============================================================

import { api } from './api';
import type { ApiResponse, Video } from '@/types';

export interface WatchPartyDetails {
  id: string;
  roomId: string;
  hostId: string;
  videoId: string;
  recordingEnabled: boolean;
  recordingStatus: 'IDLE' | 'RECORDING' | 'COMPLETED';
  createdAt: string;
  endedAt?: string | null;
  host: {
    id: string;
    name: string;
    email: string;
    planType?: string;
  };
  video: Video;
  participants: Array<{
    id: string;
    userId: string;
    joinedAt: string;
    leftAt: string | null;
  }>;
}

export async function createWatchParty(
  videoId: string,
  recordingEnabled: boolean = true
): Promise<ApiResponse<{ party: WatchPartyDetails; roomId: string; joinUrl: string }>> {
  return api.post<{ party: WatchPartyDetails; roomId: string; joinUrl: string }>('/api/watch-party', {
    videoId,
    recordingEnabled,
  });
}

export async function getWatchParty(roomId: string): Promise<ApiResponse<WatchPartyDetails>> {
  return api.get<WatchPartyDetails>(`/api/watch-party/${encodeURIComponent(roomId)}`);
}

export async function endWatchParty(roomId: string): Promise<ApiResponse<{ message: string }>> {
  return api.post<{ message: string }>(`/api/watch-party/${encodeURIComponent(roomId)}/end`, {});
}
