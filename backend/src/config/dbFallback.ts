// ============================================================
// src/config/dbFallback.ts
// In-Memory & Persistent JSON Store Fallback for Prisma
// Ensures all platform features work seamlessly even if PostgreSQL
// is not running locally.
// ============================================================

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

// Helper to generate cuid-like IDs
export function generateId(prefix = 'c'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

export interface StoredData {
  users: any[];
  loginHistories: any[];
  otpRecords: any[];
  videos: any[];
  downloads: any[];
  subscriptions: any[];
  comments: any[];
  commentReports: any[];
  watchParties: any[];
  watchPartyParticipants: any[];
}

function getInitialData(): StoredData {
  const passwordHash = bcrypt.hashSync('Password@123', 10);
  const adminHash = bcrypt.hashSync('Admin@123', 10);

  const defaultAdmin = {
    id: 'user_admin_001',
    name: 'Admin User',
    email: 'admin@streamvault.com',
    phone: '+91 9876543210',
    password: adminHash,
    role: 'ADMIN',
    planType: 'GOLD',
    themePreference: 'AUTO',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const defaultFreeUser = {
    id: 'user_free_002',
    name: 'Alex Rivera',
    email: 'alex@example.com',
    phone: '+91 9876543211',
    password: passwordHash,
    role: 'USER',
    planType: 'FREE',
    themePreference: 'AUTO',
    createdAt: new Date('2026-01-15T00:00:00Z'),
    updatedAt: new Date('2026-01-15T00:00:00Z'),
  };

  const defaultBronzeUser = {
    id: 'user_bronze_003',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    phone: '+91 9876543212',
    password: passwordHash,
    role: 'USER',
    planType: 'BRONZE',
    themePreference: 'DARK',
    createdAt: new Date('2026-02-01T00:00:00Z'),
    updatedAt: new Date('2026-02-01T00:00:00Z'),
  };

  const defaultVideos = [
    {
      id: 'vid_001',
      title: 'Big Buck Bunny — Open Source 4K CGI Animation',
      description: 'A large and lovable rabbit deals with bullying forest creatures in this iconic open-source animated film by the Blender Institute. Showcases rich color palettes, 60fps CGI rendering, and dynamic sound design.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: 596,
      category: 'Animation',
      views: 14250,
      isPublished: true,
      status: 'READY',
      uploadedById: 'user_admin_001',
      createdAt: new Date(Date.now() - 7 * 86400000),
      updatedAt: new Date(Date.now() - 7 * 86400000),
    },
    {
      id: 'vid_002',
      title: 'Tears of Steel — Sci-Fi Visual Effects & Robotics',
      description: 'Set in a dystopian future Amsterdam, a group of scientists and warriors explore robot uprisings, time manipulation, and cutting-edge VFX. A cinematic open-movie masterpiece.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      duration: 734,
      category: 'Sci-Fi',
      views: 9820,
      isPublished: true,
      status: 'READY',
      uploadedById: 'user_admin_001',
      createdAt: new Date(Date.now() - 5 * 86400000),
      updatedAt: new Date(Date.now() - 5 * 86400000),
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
      createdAt: new Date(Date.now() - 4 * 86400000),
      updatedAt: new Date(Date.now() - 4 * 86400000),
    },
    {
      id: 'vid_004',
      title: 'For Bigger Blazes — Ultra HD Action Sports & Adventure',
      description: 'Experience heart-pounding off-road adventures, extreme mountain sports, and cinematic nature landscapes captured in pristine high-definition video.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      duration: 15,
      category: 'Adventure',
      views: 18900,
      isPublished: true,
      status: 'READY',
      uploadedById: 'user_admin_001',
      createdAt: new Date(Date.now() - 3 * 86400000),
      updatedAt: new Date(Date.now() - 3 * 86400000),
    },
    {
      id: 'vid_005',
      title: 'For Bigger Escape — Mountain Serenity & Nature Symphony',
      description: 'Escape the daily hustle with sweeping aerial vistas of snow-capped alpine peaks, crystal-clear glacial streams, and tranquil wilderness sanctuaries.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      duration: 15,
      category: 'Nature',
      views: 12400,
      isPublished: true,
      status: 'READY',
      uploadedById: 'user_admin_001',
      createdAt: new Date(Date.now() - 2 * 86400000),
      updatedAt: new Date(Date.now() - 2 * 86400000),
    },
    {
      id: 'vid_006',
      title: 'We Are Going On Bullrun — High Speed Automotive Showcase',
      description: 'Supercars, engine roar, and open highway road trips. Follow luxury sports cars across cross-country rally tracks with cinematic slow-motion cinematography.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      duration: 47,
      category: 'Automotive',
      views: 22100,
      isPublished: true,
      status: 'READY',
      uploadedById: 'user_admin_001',
      createdAt: new Date(Date.now() - 1 * 86400000),
      updatedAt: new Date(Date.now() - 1 * 86400000),
    },
  ];

  const defaultComments = [
    {
      id: 'comm_001',
      userId: 'user_bronze_003',
      videoId: 'vid_001',
      text: 'The animation quality in this 4K render is breathtaking! Love the color grading.',
      language: 'en',
      translatedText: null,
      locationRegion: 'Maharashtra, India',
      isFlagged: false,
      moderationReason: null,
      reportStatus: 'NONE',
      likes: 14,
      dislikes: 1,
      createdAt: new Date(Date.now() - 2 * 86400000),
      updatedAt: new Date(Date.now() - 2 * 86400000),
    },
    {
      id: 'comm_002',
      userId: 'user_free_002',
      videoId: 'vid_001',
      text: 'यह वीडियो बहुत ही शानदार और मनोरंजक है! ऑडियो और वीएफएक्स कमाल के हैं।',
      language: 'hi',
      translatedText: 'This video is very wonderful and entertaining! The audio and VFX are amazing.',
      locationRegion: 'Delhi Region, India',
      isFlagged: false,
      moderationReason: null,
      reportStatus: 'NONE',
      likes: 21,
      dislikes: 0,
      createdAt: new Date(Date.now() - 1 * 86400000),
      updatedAt: new Date(Date.now() - 1 * 86400000),
    },
    {
      id: 'comm_003',
      userId: 'user_admin_001',
      videoId: 'vid_001',
      text: '¡Increíble trabajo! El equipo de animación de código abierto ha hecho un trabajo fenomenal.',
      language: 'es',
      translatedText: 'Incredible work! The open-source animation team has done a phenomenal job.',
      locationRegion: null,
      isFlagged: false,
      moderationReason: null,
      reportStatus: 'NONE',
      likes: 9,
      dislikes: 0,
      createdAt: new Date(Date.now() - 12 * 3600000),
      updatedAt: new Date(Date.now() - 12 * 3600000),
    },
  ];

  return {
    users: [defaultAdmin, defaultFreeUser, defaultBronzeUser],
    loginHistories: [
      {
        id: 'lh_001',
        userId: 'user_admin_001',
        cityRegion: 'Mumbai, India',
        state: 'Maharashtra',
        deviceId: 'dev_mumbai_desktop',
        ipAddress: '127.0.0.1',
        userAgent: '[Desktop | Chrome | Windows] Mozilla/5.0 Chrome/120',
        verified: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ],
    otpRecords: [
      {
        id: 'otp_001',
        userId: 'user_free_002',
        otpHash: bcrypt.hashSync('123456', 10),
        expiresAt: new Date(Date.now() + 86400000),
        attempts: 0,
        verified: true,
        createdAt: new Date('2026-01-15T00:00:00Z'),
      },
    ],
    videos: defaultVideos,
    downloads: [],
    subscriptions: [],
    comments: defaultComments,
    commentReports: [],
    watchParties: [],
    watchPartyParticipants: [],
  };
}

class Store {
  private data: StoredData;

  constructor() {
    this.data = this.load();
  }

  private load(): StoredData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure dates are parsed
        return parsed;
      }
    } catch (err) {
      console.warn('[dbFallback] Could not read db.json, using defaults:', err);
    }
    const initial = getInitialData();
    this.save(initial);
    return initial;
  }

  private save(dataToSave?: StoredData): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[dbFallback] Could not persist db.json:', err);
    }
  }

  public getData(): StoredData {
    return this.data;
  }

  public persist(): void {
    this.save();
  }
}

export const fallbackStore = new Store();

// Helper to filter objects matching Prisma 'where' clause
function matchesWhere(item: any, where: any): boolean {
  if (!where || Object.keys(where).length === 0) return true;

  for (const [key, condition] of Object.entries(where)) {
    if (key === 'OR' && Array.isArray(condition)) {
      const orMatched = condition.some((cond) => matchesWhere(item, cond));
      if (!orMatched) return false;
      continue;
    }
    if (key === 'AND' && Array.isArray(condition)) {
      const andMatched = condition.every((cond) => matchesWhere(item, cond));
      if (!andMatched) return false;
      continue;
    }

    const itemValue = item[key];

    if (condition === undefined) continue;

    if (typeof condition === 'object' && condition !== null) {
      const condObj = condition as any;
      if ('equals' in condObj) {
        if (condObj.mode === 'insensitive') {
          if (String(itemValue).toLowerCase() !== String(condObj.equals).toLowerCase()) return false;
        } else {
          if (itemValue !== condObj.equals) return false;
        }
      } else if ('contains' in condObj) {
        if (!itemValue) return false;
        if (condObj.mode === 'insensitive') {
          if (!String(itemValue).toLowerCase().includes(String(condObj.contains).toLowerCase())) return false;
        } else {
          if (!String(itemValue).includes(String(condObj.contains))) return false;
        }
      } else if ('gte' in condObj) {
        const condDate = new Date(condObj.gte).getTime();
        const itemDate = new Date(itemValue).getTime();
        if (itemDate < condDate) return false;
      } else if ('lte' in condObj) {
        const condDate = new Date(condObj.lte).getTime();
        const itemDate = new Date(itemValue).getTime();
        if (itemDate > condDate) return false;
      } else if ('not' in condObj) {
        if (itemValue === condObj.not) return false;
      }
    } else {
      if (itemValue !== condition) return false;
    }
  }
  return true;
}

// Create a generic CRUD model proxy for Prisma
export function createModelProxy(collectionName: keyof StoredData, idPrefix: string) {
  const store = fallbackStore;

  return {
    async findUnique(args: { where: any; include?: any; select?: any }) {
      const data = store.getData()[collectionName] as any[];
      const found = data.find((item) => matchesWhere(item, args.where));
      if (!found) return null;
      return resolveRelations(collectionName, found, args.include, args.select);
    },

    async findFirst(args: { where?: any; orderBy?: any; include?: any; select?: any }) {
      let data = [...(store.getData()[collectionName] as any[])];
      if (args?.where) {
        data = data.filter((item) => matchesWhere(item, args.where));
      }
      if (args?.orderBy) {
        applyOrderBy(data, args.orderBy);
      }
      if (data.length === 0) return null;
      return resolveRelations(collectionName, data[0], args?.include, args?.select);
    },

    async findMany(args?: { where?: any; orderBy?: any; skip?: number; take?: number; include?: any; select?: any }) {
      let data = [...(store.getData()[collectionName] as any[])];
      if (args?.where) {
        data = data.filter((item) => matchesWhere(item, args.where));
      }
      if (args?.orderBy) {
        applyOrderBy(data, args.orderBy);
      }
      if (args?.skip !== undefined) {
        data = data.slice(args.skip);
      }
      if (args?.take !== undefined) {
        data = data.slice(0, args.take);
      }
      return data.map((item) => resolveRelations(collectionName, item, args?.include, args?.select));
    },

    async create(args: { data: any; include?: any; select?: any }) {
      const raw = { ...args.data };
      const newItem = {
        id: raw.id || generateId(idPrefix),
        ...raw,
        createdAt: raw.createdAt || new Date(),
        updatedAt: raw.updatedAt || new Date(),
      };
      (store.getData()[collectionName] as any[]).push(newItem);
      store.persist();
      return resolveRelations(collectionName, newItem, args.include, args.select);
    },

    async update(args: { where: any; data: any; include?: any; select?: any }) {
      const list = store.getData()[collectionName] as any[];
      const idx = list.findIndex((item) => matchesWhere(item, args.where));
      if (idx === -1) {
        throw new Error(`Record to update not found in ${collectionName}`);
      }
      const existing = list[idx];
      const updated = {
        ...existing,
        ...args.data,
        updatedAt: new Date(),
      };
      list[idx] = updated;
      store.persist();
      return resolveRelations(collectionName, updated, args.include, args.select);
    },

    async updateMany(args: { where: any; data: any }) {
      const list = store.getData()[collectionName] as any[];
      let count = 0;
      for (let i = 0; i < list.length; i++) {
        if (matchesWhere(list[i], args.where)) {
          list[i] = { ...list[i], ...args.data, updatedAt: new Date() };
          count++;
        }
      }
      store.persist();
      return { count };
    },

    async delete(args: { where: any }) {
      const list = store.getData()[collectionName] as any[];
      const idx = list.findIndex((item) => matchesWhere(item, args.where));
      if (idx === -1) {
        throw new Error(`Record to delete not found in ${collectionName}`);
      }
      const [deleted] = list.splice(idx, 1);
      store.persist();
      return deleted;
    },

    async count(args?: { where?: any }) {
      let data = store.getData()[collectionName] as any[];
      if (args?.where) {
        data = data.filter((item) => matchesWhere(item, args.where));
      }
      return data.length;
    },

    async upsert(args: { where: any; create: any; update: any; include?: any }) {
      const list = store.getData()[collectionName] as any[];
      const idx = list.findIndex((item) => matchesWhere(item, args.where));
      if (idx !== -1) {
        const updated = { ...list[idx], ...args.update, updatedAt: new Date() };
        list[idx] = updated;
        store.persist();
        return resolveRelations(collectionName, updated, args.include);
      } else {
        const newItem = {
          id: args.create.id || generateId(idPrefix),
          ...args.create,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        list.push(newItem);
        store.persist();
        return resolveRelations(collectionName, newItem, args.include);
      }
    },
  };
}

function applyOrderBy(data: any[], orderBy: any) {
  if (Array.isArray(orderBy)) {
    orderBy = orderBy[0];
  }
  if (!orderBy) return;
  const [field, direction] = Object.entries(orderBy)[0];
  data.sort((a, b) => {
    const valA = a[field] instanceof Date ? a[field].getTime() : a[field];
    const valB = b[field] instanceof Date ? b[field].getTime() : b[field];
    if (valA < valB) return direction === 'desc' ? 1 : -1;
    if (valA > valB) return direction === 'desc' ? -1 : 1;
    return 0;
  });
}

function resolveRelations(collection: string, item: any, include?: any, select?: any) {
  if (!item) return null;
  const data = fallbackStore.getData();
  const res = { ...item };

  if (collection === 'videos' || collection === 'video') {
    if (include?.uploadedBy || select?.uploadedBy) {
      const u = data.users.find((u) => u.id === res.uploadedById);
      res.uploadedBy = u ? { id: u.id, name: u.name, email: u.email } : null;
    }
  }

  if (collection === 'comments') {
    if (include?.user || select?.user) {
      const u = data.users.find((u) => u.id === res.userId);
      res.user = u ? { id: u.id, name: u.name, planType: u.planType, role: u.role } : null;
    }
    if (include?.video || select?.video) {
      const v = data.videos.find((v) => v.id === res.videoId);
      res.video = v ? { id: v.id, title: v.title } : null;
    }
    if (include?.reports) {
      res.reports = data.commentReports.filter((r) => r.commentId === res.id);
    }
  }

  if (collection === 'downloads') {
    if (include?.video || select?.video) {
      const v = data.videos.find((v) => v.id === res.videoId);
      res.video = v || null;
    }
    if (include?.user || select?.user) {
      const u = data.users.find((u) => u.id === res.userId);
      res.user = u || null;
    }
  }

  if (collection === 'users') {
    if (include?.otpRecords) {
      let otps = data.otpRecords.filter((o) => o.userId === res.id);
      if (include.otpRecords.where) {
        otps = otps.filter((o) => matchesWhere(o, include.otpRecords.where));
      }
      res.otpRecords = otps;
    }
    if (include?.loginHistories) {
      let lhs = data.loginHistories.filter((l) => l.userId === res.id);
      if (include.loginHistories.where) {
        lhs = lhs.filter((l) => matchesWhere(l, include.loginHistories.where));
      }
      if (include.loginHistories.orderBy) {
        applyOrderBy(lhs, include.loginHistories.orderBy);
      }
      if (include.loginHistories.take) {
        lhs = lhs.slice(0, include.loginHistories.take);
      }
      res.loginHistories = lhs;
    }
  }

  if (collection === 'watchParties') {
    if (include?.host) {
      const u = data.users.find((u) => u.id === res.hostId);
      res.host = u ? { id: u.id, name: u.name } : null;
    }
    if (include?.video) {
      const v = data.videos.find((v) => v.id === res.videoId);
      res.video = v || null;
    }
    if (include?.participants) {
      res.participants = data.watchPartyParticipants
        .filter((p) => p.partyId === res.id)
        .map((p) => {
          const u = data.users.find((user) => user.id === p.userId);
          return {
            ...p,
            user: u ? { id: u.id, name: u.name, planType: u.planType } : null,
          };
        });
    }
  }

  // Filter fields if select is specified
  if (select && typeof select === 'object') {
    const selected: any = {};
    for (const [key, shouldSelect] of Object.entries(select)) {
      if (shouldSelect) {
        selected[key] = res[key];
      }
    }
    return selected;
  }

  return res;
}
