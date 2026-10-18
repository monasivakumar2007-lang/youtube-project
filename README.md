# StreamVault — Video Streaming & Social Platform

> A modern, full-stack video streaming and social platform built with Next.js, Express.js, PostgreSQL, Socket.IO, and WebRTC.

---

## 1. Project Overview

StreamVault allows users to:

- Watch and stream HD videos
- Download videos based on their subscription tier
- Comment on videos with multilingual support and AI moderation
- Subscribe to plans (FREE / BRONZE / SILVER / GOLD) via Razorpay
- Join synchronised Watch Parties with live chat, WebRTC audio/video, and screen sharing
- Log in securely with OTP verification for new devices or locations

Admins can manage flagged comments through a moderation dashboard.

---

## 2. Technology Stack

| Layer          | Technology                                   |
|----------------|----------------------------------------------|
| Frontend       | Next.js 14 (App Router), TypeScript          |
| Styling        | Tailwind CSS, Framer Motion                  |
| Backend        | Node.js, Express.js, TypeScript              |
| Real-time      | Socket.IO                                    |
| Video Calls    | WebRTC                                       |
| Database       | PostgreSQL                                   |
| ORM            | Prisma                                       |
| Auth           | JWT (access + refresh tokens), bcrypt        |
| Payments       | Razorpay (Test Mode)                         |
| AI             | Translation API, Toxicity Detection          |

---

## 3. Folder Structure

```
you tube project/
│
├── frontend/                   Next.js App Router application
│   ├── app/                    Pages, layouts, and route segments
│   ├── components/             Reusable UI components (buttons, cards, modals)
│   ├── features/               Feature-specific modules (auth, video, watchparty)
│   ├── hooks/                  Custom React hooks (useAuth, useTheme, etc.)
│   ├── lib/                    Utilities: API client, theme resolver, helpers
│   ├── services/               API call functions grouped by domain
│   ├── types/                  Shared TypeScript interfaces and enums
│   ├── public/                 Static assets (images, icons, fonts)
│   └── styles/                 Global CSS and Tailwind base
│
├── backend/
│   └── src/
│       ├── controllers/        Request handlers (thin; business logic in services)
│       ├── routes/             Express Router definitions for each domain
│       ├── services/           Business logic (auth, video, OTP, downloads, etc.)
│       ├── middleware/         authenticate, requireAdmin, downloadLimit, errorHandler
│       ├── socket/             Socket.IO event handlers for Watch Party / WebRTC
│       ├── webrtc/             WebRTC signalling helpers and TURN config
│       ├── utils/              Helpers: hashing, JWT, OTP generator, mailer
│       └── config/             Environment variables, Prisma client singleton
│
├── prisma/
│   └── schema.prisma           Database schema: 10 models, 6 enums
│
├── .env.example                Template for all required environment variables
├── .gitignore                  Excludes .env, node_modules, .next, dist
├── README.md                   This file
└── package.json                Workspace root (npm workspaces)
```

---

## 4. PostgreSQL Setup

1. Install PostgreSQL (≥ 14): https://www.postgresql.org/download/
2. Create the database:

```sql
CREATE DATABASE video_platform;
CREATE USER your_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE video_platform TO your_user;
```

3. Copy and fill in the connection string:

```
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/video_platform"
```

---

## 5. Prisma Setup

```bash
# Install Prisma CLI and client
cd video-streaming-platform
npm install

# Install backend dependencies (includes @prisma/client and prisma)
cd backend
npm install
```

---

## 6. Environment Variables

Copy `.env.example` to `.env` in the project root and fill in your values:

```bash
cp .env.example .env
```

| Variable               | Description                          |
|------------------------|--------------------------------------|
| `DATABASE_URL`         | PostgreSQL connection string         |
| `JWT_SECRET`           | Secret for signing access tokens     |
| `JWT_REFRESH_SECRET`   | Secret for signing refresh tokens    |
| `RAZORPAY_KEY_ID`      | Razorpay test mode key ID            |
| `RAZORPAY_KEY_SECRET`  | Razorpay test mode key secret        |
| `NEXT_PUBLIC_API_URL`  | Backend URL (accessible from browser)|
| `CLIENT_URL`           | Frontend URL for CORS                |
| `SMTP_*`               | SMTP credentials for OTP emails      |

---

## 7. Database Migration Commands

Run from the `video-streaming-platform/` root directory where `prisma/schema.prisma` lives.

```bash
# 1. Generate Prisma Client (after every schema change)
npx prisma generate --schema=./prisma/schema.prisma

# 2. Create and apply the initial migration
npx prisma migrate dev --name init --schema=./prisma/schema.prisma

# 3. Apply existing migrations to a production database
npx prisma migrate deploy --schema=./prisma/schema.prisma

# 4. Open Prisma Studio (visual database browser)
npx prisma studio --schema=./prisma/schema.prisma

# 5. Validate schema without migrating
npx prisma validate --schema=./prisma/schema.prisma

# 6. Reset the database (⚠️ deletes all data)
npx prisma migrate reset --schema=./prisma/schema.prisma
```

---

## 8. How to Start the Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## 9. How to Start the Backend

```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:5000
# Health check: GET http://localhost:5000/health
```

---

## 10. Development Roadmap

| Phase | Description                                                        | Status        |
|-------|--------------------------------------------------------------------|---------------|
| 1     | Project foundation, database schema, architecture docs             | ✅ Complete   |
| 2     | Auth (register, login, OTP, JWT), protected routes, user profile   | ⬜ Next       |
| 3     | Video listing, video detail page, video player                     | ⬜ Planned    |
| 4     | Comments system with AI moderation and translation                 | ⬜ Planned    |
| 5     | Subscriptions with Razorpay integration                            | ⬜ Planned    |
| 6     | Download system with plan-based quota enforcement                  | ⬜ Planned    |
| 7     | Watch Party — Socket.IO synchronisation and live chat              | ⬜ Planned    |
| 8     | Watch Party — WebRTC audio/video and screen sharing                | ⬜ Planned    |
| 9     | Admin dashboard — comment moderation, user management              | ⬜ Planned    |
| 10    | AI recommendations, analytics, performance optimisation            | ⬜ Planned    |

---

## Security Notes

- **Never commit `.env`** — it is in `.gitignore`
- **OTPs are never stored as plain text** — always hashed with bcrypt
- **Passwords are never stored as plain text** — always hashed with bcrypt
- **JWT tokens** have short expiry (15 min access, 7 day refresh)
- **Razorpay payments** are verified using HMAC signature on the backend

---

## License

MIT
