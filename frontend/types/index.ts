// ============================================================
// types/index.ts
// Shared TypeScript types mirroring the Prisma schema
// These types are used across frontend services and components.
// ============================================================

// ─── Enums ───────────────────────────────────────────────────

export type PlanType = 'FREE' | 'BRONZE' | 'SILVER' | 'GOLD';

export type Role = 'USER' | 'ADMIN';

export type ThemePreference = 'AUTO' | 'LIGHT' | 'DARK';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export type ReportStatus = 'NONE' | 'PENDING_REVIEW' | 'REVIEWED' | 'RESOLVED';

export type RecordingStatus = 'IDLE' | 'RECORDING' | 'COMPLETED';

// ─── API Response Wrapper ────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// ─── User ────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  planType: PlanType;
  themePreference: ThemePreference;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser extends User {
  token: string;
  refreshToken?: string;
}

export type VideoStatus = 'PROCESSING' | 'READY' | 'FAILED';

export type VideoCategory =
  | 'All'
  | 'Movies'
  | 'Music'
  | 'Education'
  | 'Technology'
  | 'Gaming'
  | 'Entertainment'
  | 'Sports'
  | 'Other';

export const VIDEO_CATEGORIES: VideoCategory[] = [
  'All',
  'Technology',
  'Gaming',
  'Education',
  'Entertainment',
  'Music',
  'Movies',
  'Sports',
  'Other',
];

// ─── Video ───────────────────────────────────────────────────

export interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number; // seconds
  category: string;
  views: number;
  isPublished: boolean;
  status: VideoStatus;
  uploadedById?: string | null;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface VideoPaginationData {
  videos: Video[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface VideoQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: VideoStatus;
}


// ─── Comment ─────────────────────────────────────────────────

export interface Comment {
  id: string;
  userId: string;
  videoId: string;
  text: string;
  language?: string;
  translatedText?: string;
  locationRegion?: string;
  isFlagged: boolean;
  reportStatus: ReportStatus;
  likes: number;
  dislikes: number;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, 'id' | 'name'>;
}

// ─── Download ────────────────────────────────────────────────

export interface Download {
  id: string;
  userId: string;
  videoId: string;
  planType: PlanType;
  downloadedAt: string;
  video?: Pick<Video, 'id' | 'title' | 'thumbnailUrl'>;
}

// ─── Subscription ────────────────────────────────────────────

export interface Subscription {
  id: string;
  userId: string;
  planType: PlanType;
  amount: number; // paise
  status: PaymentStatus;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

// ─── Watch Party ─────────────────────────────────────────────

export interface WatchParty {
  id: string;
  hostId: string;
  roomId: string;
  videoId: string;
  recordingEnabled: boolean;
  recordingStatus: RecordingStatus;
  createdAt: string;
  endedAt?: string;
  host?: Pick<User, 'id' | 'name'>;
  video?: Pick<Video, 'id' | 'title' | 'thumbnailUrl'>;
  participants?: WatchPartyParticipant[];
}

export interface WatchPartyParticipant {
  id: string;
  partyId: string;
  userId: string;
  joinedAt: string;
  leftAt?: string;
  user?: Pick<User, 'id' | 'name'>;
}

// ─── Download Limits ─────────────────────────────────────────

export const DOWNLOAD_LIMITS: Record<PlanType, number | null> = {
  FREE:   1,
  BRONZE: 5,
  SILVER: 15,
  GOLD:   null, // null = unlimited
};
