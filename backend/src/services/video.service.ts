// ============================================================
// src/services/video.service.ts
// Video CRUD, Pagination, Search & View Operations
// ============================================================

import { prisma } from '../config/prisma';
import path from 'path';
import fs from 'fs';

const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');
const VIDEO_DIR = path.resolve(UPLOAD_ROOT, 'videos');
const THUMB_DIR = path.resolve(UPLOAD_ROOT, 'thumbnails');

export interface VideoListQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  includeUnpublished?: boolean;
}

export interface CreateVideoInput {
  title: string;
  description?: string;
  category: string;
  duration?: number;
  thumbnailUrl: string;
  videoUrl: string;
  isPublished?: boolean;
  uploadedById: string;
}

export interface UpdateVideoInput {
  title?: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  isPublished?: boolean;
}

/**
 * List videos with server-side pagination, search, and category filter.
 */
export async function listVideos(query: VideoListQuery) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  // Publish filter
  if (!query.includeUnpublished) {
    where.isPublished = true;
  }

  // Category filter
  if (query.category && query.category !== 'All') {
    where.category = {
      equals: query.category,
      mode: 'insensitive',
    };
  }

  // Search filter across title, description, category
  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { category: { contains: term, mode: 'insensitive' } },
    ];
  }

  // Execute query and total count in parallel
  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        videoUrl: true,
        duration: true,
        category: true,
        views: true,
        isPublished: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        uploadedById: true,
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.video.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    videos,
    page,
    limit,
    total,
    totalPages,
  };
}

/**
 * Retrieve single video by ID, ensuring sensitive fields are not exposed.
 */
export async function getVideoById(id: string, userRole?: string, userId?: string) {
  const video = await prisma.video.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      videoUrl: true,
      duration: true,
      category: true,
      views: true,
      isPublished: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      uploadedById: true,
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!video) {
    return null;
  }

  // If unpublished, only allow admin or original uploader to view
  if (!video.isPublished) {
    const isOwner = userId && video.uploadedById === userId;
    const isAdmin = userRole === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return null;
    }
  }

  return video;
}

/**
 * Insert a new video record into the database.
 */
export async function createVideo(data: CreateVideoInput) {
  return prisma.video.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      category: data.category.trim(),
      duration: Math.max(0, Number(data.duration) || 0),
      thumbnailUrl: data.thumbnailUrl,
      videoUrl: data.videoUrl,
      isPublished: data.isPublished !== undefined ? Boolean(data.isPublished) : true,
      status: 'READY',
      uploadedById: data.uploadedById,
    },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      videoUrl: true,
      duration: true,
      category: true,
      views: true,
      isPublished: true,
      status: true,
      createdAt: true,
      uploadedById: true,
    },
  });
}

/**
 * Update video metadata (ADMIN or owner).
 */
export async function updateVideo(
  id: string,
  data: UpdateVideoInput,
  userRole?: string,
  userId?: string
) {
  const existing = await prisma.video.findUnique({
    where: { id },
    select: { id: true, uploadedById: true },
  });

  if (!existing) {
    return { notFound: true };
  }

  const isOwner = userId && existing.uploadedById === userId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return { forbidden: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description.trim();
  if (data.category !== undefined) updateData.category = data.category.trim();
  if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
  if (data.isPublished !== undefined) updateData.isPublished = Boolean(data.isPublished);

  const updated = await prisma.video.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      videoUrl: true,
      duration: true,
      category: true,
      views: true,
      isPublished: true,
      status: true,
      updatedAt: true,
    },
  });

  return { video: updated };
}

/**
 * Delete a video and clean up its local video and thumbnail files.
 */
export async function deleteVideo(id: string, userRole?: string, userId?: string) {
  const existing = await prisma.video.findUnique({
    where: { id },
    select: {
      id: true,
      videoUrl: true,
      thumbnailUrl: true,
      uploadedById: true,
    },
  });

  if (!existing) {
    return { notFound: true };
  }

  const isOwner = userId && existing.uploadedById === userId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return { forbidden: true };
  }

  // Delete DB record first
  await prisma.video.delete({
    where: { id },
  });

  // Attempt to delete local video file safely
  try {
    if (existing.videoUrl) {
      const vBasename = path.basename(existing.videoUrl);
      const vPath = path.resolve(VIDEO_DIR, vBasename);
      if (vPath.startsWith(VIDEO_DIR) && fs.existsSync(vPath)) {
        fs.unlinkSync(vPath);
      }
    }
  } catch (err) {
    console.warn(`[Delete Video] Could not remove video file for id ${id}:`, err);
  }

  // Attempt to delete local thumbnail file safely
  try {
    if (existing.thumbnailUrl && !existing.thumbnailUrl.startsWith('http')) {
      const tBasename = path.basename(existing.thumbnailUrl);
      const tPath = path.resolve(THUMB_DIR, tBasename);
      if (tPath.startsWith(THUMB_DIR) && fs.existsSync(tPath)) {
        fs.unlinkSync(tPath);
      }
    }
  } catch (err) {
    console.warn(`[Delete Video] Could not remove thumbnail file for id ${id}:`, err);
  }

  return { success: true };
}

/**
 * Increment video views atomically.
 */
export async function incrementVideoViews(id: string) {
  return prisma.video.update({
    where: { id },
    data: {
      views: { increment: 1 },
    },
    select: {
      id: true,
      views: true,
    },
  });
}
