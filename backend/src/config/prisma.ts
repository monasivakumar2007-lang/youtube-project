import { PrismaClient } from '@prisma/client';
import { createModelProxy, StoredData } from './dbFallback';

// Initialize native PrismaClient
let nativePrisma: PrismaClient | null = null;
let isPostgresAvailable = false;

try {
  nativePrisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  });
} catch (err) {
  console.warn('[Prisma] Native PrismaClient init warning:', err);
}

// Model proxies for resilient fallback
const fallbackProxies = {
  user: createModelProxy('users', 'user'),
  loginHistory: createModelProxy('loginHistories', 'lh'),
  oTPVerification: createModelProxy('otpRecords', 'otp'),
  video: createModelProxy('videos', 'vid'),
  download: createModelProxy('downloads', 'dl'),
  subscription: createModelProxy('subscriptions', 'sub'),
  comment: createModelProxy('comments', 'comm'),
  commentReport: createModelProxy('commentReports', 'cr'),
  watchParty: createModelProxy('watchParties', 'wp'),
  watchPartyParticipant: createModelProxy('watchPartyParticipants', 'wpp'),
};

// Check PostgreSQL connection asynchronously on startup
if (nativePrisma) {
  nativePrisma.$connect()
    .then(() => {
      isPostgresAvailable = true;
      console.log('✅ PostgreSQL Database connected successfully via Prisma');
    })
    .catch((err) => {
      isPostgresAvailable = false;
      console.log('ℹ️ PostgreSQL not reachable (' + err.message.split('\n')[0] + '). Using built-in persistent store (db.json).');
    });
}

// Smart Prisma Proxy that delegates to native Prisma if Postgres is up, or fallback store if not
export const prisma: any = new Proxy(
  {},
  {
    get(_target, prop: string) {
      if (prop === '$connect') {
        return async () => {
          if (isPostgresAvailable && nativePrisma) {
            return nativePrisma.$connect();
          }
          return Promise.resolve();
        };
      }
      if (prop === '$disconnect') {
        return async () => {
          if (isPostgresAvailable && nativePrisma) {
            return nativePrisma.$disconnect();
          }
          return Promise.resolve();
        };
      }

      // Check if this is a supported model in our fallback
      if (prop in fallbackProxies) {
        const fallbackModel = (fallbackProxies as any)[prop];

        if (isPostgresAvailable && nativePrisma && (nativePrisma as any)[prop]) {
          const nativeModel = (nativePrisma as any)[prop];

          // Wrap method calls in try-catch to fallback seamlessly if connection drops
          return new Proxy(nativeModel, {
            get(modelTarget, method: string) {
              const origMethod = modelTarget[method];
              if (typeof origMethod !== 'function') return origMethod;

              return async (...args: any[]) => {
                try {
                  return await origMethod.apply(modelTarget, args);
                } catch (dbErr: any) {
                  // If connection issue, use fallback
                  if (dbErr.code === 'P1001' || dbErr.message?.includes("Can't reach database")) {
                    isPostgresAvailable = false;
                    console.warn(`[Prisma Fallback] ${prop}.${method} failed, using fallback store`);
                    if (fallbackModel[method]) {
                      return fallbackModel[method](...args);
                    }
                  }
                  throw dbErr;
                }
              };
            },
          });
        }

        return fallbackModel;
      }

      // Fallback for other Prisma properties
      if (nativePrisma && (nativePrisma as any)[prop]) {
        return (nativePrisma as any)[prop];
      }

      return undefined;
    },
  }
);
