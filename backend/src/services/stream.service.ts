// ============================================================
// src/services/stream.service.ts
// Secure HTTP 206 Range-based Video Streaming Service
// ============================================================

import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');
const VIDEO_DIR = path.resolve(UPLOAD_ROOT, 'videos');

/**
 * Determine MIME type based on file extension.
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.ogg':
      return 'video/ogg';
    case '.mov':
      return 'video/quicktime';
    default:
      return 'video/mp4';
  }
}

/**
 * Resolves a stored video URL or filename to an absolute on-disk path safely.
 * Throws an error if path traversal is attempted or file does not exist.
 */
export function resolveSafeVideoPath(storedUrlOrPath: string): string | null {
  // Stored path could be a relative filename 'video_123.mp4', or '/uploads/videos/video_123.mp4'
  const basename = path.basename(storedUrlOrPath);
  const resolved = path.resolve(VIDEO_DIR, basename);

  // Security guard: Ensure resolved path strictly stays inside VIDEO_DIR
  if (!resolved.startsWith(VIDEO_DIR)) {
    return null;
  }

  if (!fs.existsSync(resolved)) {
    return null;
  }

  return resolved;
}

/**
 * Streams a video file using HTTP 206 Partial Content range requests.
 */
export function streamVideoFile(filePath: string, req: Request, res: Response): void {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const rangeHeader = req.headers.range;
  const contentType = getMimeType(filePath);

  if (rangeHeader) {
    // Parse Range header e.g. "bytes=32324-" or "bytes=0-1048575"
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // Validate range limits
    if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
      res.status(416).set({
        'Content-Range': `bytes */${fileSize}`,
      }).json({
        success: false,
        message: 'Requested Range Not Satisfiable',
      });
      return;
    }

    const chunkSize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, private',
    });

    fileStream.on('error', (err) => {
      console.error('[Stream Error]', err.message);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    fileStream.pipe(res);
  } else {
    // Standard full-stream request
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache, private',
    });

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (err) => {
      console.error('[Stream Error]', err.message);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    fileStream.pipe(res);
  }
}
