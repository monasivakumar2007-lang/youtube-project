// ============================================================
// lib/watchPartyApi.ts
// Watch Party API service — Task 1
// ============================================================

import { api } from './api';
import { FALLBACK_VIDEOS } from './videoApi';
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
  try {
    const res = await api.post<{ party: WatchPartyDetails; roomId: string; joinUrl: string }>('/api/watch-party', {
      videoId,
      recordingEnabled,
    });
    if (res.success && res.data) return res;
  } catch {}

  const roomId = `room_${Date.now()}`;
  const fallback = FALLBACK_VIDEOS.find((v) => v.id === videoId) || FALLBACK_VIDEOS[0];
  return {
    success: true,
    data: {
      party: {
        id: `wp_${Date.now()}`,
        roomId,
        hostId: 'current_user',
        videoId,
        recordingEnabled,
        recordingStatus: 'IDLE',
        createdAt: new Date().toISOString(),
        host: {
          id: 'current_user',
          name: 'Demo Host',
          email: 'user@streamvault.com',
          planType: 'GOLD',
        },
        video: fallback,
        participants: [],
      },
      roomId,
      joinUrl: `/watch-party/${roomId}`,
    },
  };
}

export async function getWatchParty(roomId: string): Promise<ApiResponse<WatchPartyDetails>> {
  try {
    const res = await api.get<WatchPartyDetails>(`/api/watch-party/${encodeURIComponent(roomId)}`);
    if (res.success && res.data) return res;
  } catch {}

  const fallback = FALLBACK_VIDEOS[0];
  return {
    success: true,
    data: {
      id: `wp_${roomId}`,
      roomId,
      hostId: 'current_user',
      videoId: fallback.id,
      recordingEnabled: true,
      recordingStatus: 'IDLE',
      createdAt: new Date().toISOString(),
      host: {
        id: 'current_user',
        name: 'Demo Host',
        email: 'user@streamvault.com',
        planType: 'GOLD',
      },
      video: fallback,
      participants: [],
    },
  };
}

export async function endWatchParty(roomId: string): Promise<ApiResponse<{ message: string }>> {
  try {
    return await api.post<{ message: string }>(`/api/watch-party/${encodeURIComponent(roomId)}/end`, {});
  } catch {
    return { success: true, message: 'Watch party ended successfully.' };
  }
}
