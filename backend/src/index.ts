import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import path from 'path';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import videoRoutes from './routes/video.routes';
import downloadRoutes from './routes/download.routes';
import subscriptionRoutes from './routes/subscription.routes';
import commentRoutes from './routes/comment.routes';
import watchPartyRoutes from './routes/watchParty.routes';
import { registerWatchPartyHandlers } from './socket/watchParty.socket';

const app = express();
const server = http.createServer(app);

// ─── Socket.IO Setup for Watch Party & WebRTC Signalling ──────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: [env.clientUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

registerWatchPartyHandlers(io);

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: [env.clientUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-client-city', 'x-client-state', 'x-client-country', 'x-device-id'],
  })
);

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxRequests * 5, // generous limit for development & testing
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use(globalLimiter);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Video Streaming Platform API is running',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
    tasksSupported: ['Task 1: Watch Party', 'Task 2: Downloads', 'Task 3: Subscriptions', 'Task 4: Custom Player', 'Task 5: Time/Location UX & OTP', 'Task 6: Multilingual Comments & Moderation'],
  });
});

// ─── Static Thumbnails Serving ────────────────────────────────────────────────
app.use(
  '/uploads/thumbnails',
  express.static(path.resolve(__dirname, '../uploads/thumbnails'), {
    maxAge: '1d',
    dotfiles: 'ignore',
  })
);

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/videos', commentRoutes);
app.use('/api', commentRoutes); // Handles /api/comments/:id/like, /api/comments/:id/translate, etc.
app.use('/api/watch-party', watchPartyRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
server.listen(env.port, () => {
  console.log(`✅ Backend running on http://localhost:${env.port}`);
  console.log(`🌍 Environment: ${env.nodeEnv}`);
  console.log(`🔗 CORS origin: ${env.clientUrl}`);
  console.log(`🎉 Socket.IO registered for Watch Party & WebRTC`);
});

export default app;
