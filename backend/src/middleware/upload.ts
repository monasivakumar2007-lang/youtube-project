// ============================================================
// src/middleware/upload.ts
// Multer file upload middleware with disk storage & validation
// ============================================================

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');
const VIDEO_DIR = path.join(UPLOAD_ROOT, 'videos');
const THUMB_DIR = path.join(UPLOAD_ROOT, 'thumbnails');

// Ensure directories exist
if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true });

const ALLOWED_VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']);
const ALLOWED_THUMB_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, VIDEO_DIR);
    } else if (file.fieldname === 'thumbnail') {
      cb(null, THUMB_DIR);
    } else {
      cb(new Error(`Invalid upload field: ${file.fieldname}`), '');
    }
  },
  filename: (_req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const cleanExt = rawExt ? rawExt : file.fieldname === 'video' ? '.mp4' : '.jpg';
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const safeName = `${file.fieldname}_${Date.now()}_${randomSuffix}${cleanExt}`;
    cb(null, safeName);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.fieldname === 'video') {
    if (ALLOWED_VIDEO_MIMES.has(file.mimetype) || file.originalname.match(/\.(mp4|webm|mov|mkv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only MP4 and WebM video files are supported.'));
    }
  } else if (file.fieldname === 'thumbnail') {
    if (ALLOWED_THUMB_MIMES.has(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP image files are supported for thumbnails.'));
    }
  } else {
    cb(new Error('Unexpected field in multipart form.'));
  }
};

export const uploadVideoFiles = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 300 * 1024 * 1024, // 300 MB maximum for video
  },
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);
