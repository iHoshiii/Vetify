# Vetify — Architecture

## Overview

Vite + React (client) and Express (server) monorepo under a single `src/` directory. Shared Zod schemas live in `src/shared/` and are imported by both sides.

## Hosting (Planned)

```
User
 │
 ├──> CloudFront ──> S3  (React static build)
 │
 └──> API Gateway ──> Lambda  (Express app via serverless-express)
                          │
                      MongoDB Atlas
```

- Frontend: S3 bucket (no static hosting) + CloudFront distribution
- Backend: API Gateway (HTTP API) → Lambda wrapping the Express app
- Database: MongoDB Atlas — same cluster for both Mongoose (runtime) and Prisma (schema)
- Custom domains required for httpOnly cookies to work cross-origin (`yourapp.com` + `api.yourapp.com`)

## Directory Map

```
vetify/
├── .github/
│   └── workflows/
│       └── ci.yml                  # CI — runs tests only
├── .husky/
│   └── pre-commit                  # runs lint-staged (prettier)
├── archive/                        # historical backups
├── docs/                           # PRD, TDD, architecture, etc.
├── prisma/
│   ├── schema.prisma               # MongoDB schema (Pet, User)
│   └── prisma.config.ts            # loads .env for Prisma 7
├── public/                         # static assets
├── src/
│   ├── client/                     # React + Vite frontend
│   │   ├── __tests__/
│   │   ├── components/             # UI components (ChatWindow, etc.)
│   │   ├── lib/
│   │   │   └── auth.ts             # readAuthState, loginWithEmail, etc.
│   │   ├── pages/                  # route-level page components
│   │   └── services/
│   │       ├── api.ts              # apiFetch wrapper + ApiError
│   │       └── chat.service.ts     # sendMessage → POST /api/v1/chat
│   ├── server/                     # Express backend
│   │   ├── config/
│   │   │   ├── db.ts               # Mongoose connection
│   │   │   └── env.ts              # Zod-validated env schema
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts
│   │   │   ├── security.ts         # helmet, cors, rate-limit
│   │   │   └── validate.ts         # Zod request validation middleware
│   │   ├── models/
│   │   │   ├── User.ts             # bcrypt password hashing, toPublic()
│   │   │   ├── Pet.ts
│   │   │   └── RefreshToken.ts     # hashed token + revocation
│   │   ├── routes/v1/
│   │   │   ├── auth.route.ts       # signup, login, refresh, logout
│   │   │   └── chat.route.ts       # POST /api/v1/chat
│   │   └── services/
│   │       ├── auth.service.ts     # JWT signing, refresh token lifecycle
│   │       └── chat.service.ts     # Gemini generateReply + LangSmith
│   └── shared/
│       └── schemas.ts              # Zod schemas used by client + server
├── tests/
│   └── e2e/                        # Playwright E2E tests
├── types/
│   └── global-css.d.ts
├── .eslintrc.json
├── .prettierrc
├── nodemon.json
├── package.json
├── tailwind.config.ts
├── tsconfig.base.json
├── tsconfig.client.json
├── tsconfig.server.json
├── vite.config.ts
└── vitest.config.ts
```

## Auth Flow

```
Signup / Login
  → server returns accessToken (response body) + refreshToken (httpOnly cookie)
  → client stores { accessToken, user } in localStorage (vetify.auth)

Authenticated request
  → client sends Authorization: Bearer <accessToken>

Token refresh
  → client hits POST /api/v1/auth/refresh
  → server reads httpOnly cookie, verifies hash against DB, issues new accessToken

Logout
  → server revokes refresh token in MongoDB
  → client clears localStorage
```

## Shared Schemas (`src/shared/schemas.ts`)

Single source of truth for validation rules used by both sides:

- `loginSchema` — email + password
- `signupSchema` — name, email, password with strength rules, confirmPassword match
- `chatRequestSchema` — message, history, session_id, model (whitelisted)

## Key Dependencies

| Package                 | Purpose                       |
| ----------------------- | ----------------------------- |
| `express`               | HTTP server                   |
| `mongoose`              | MongoDB ODM                   |
| `@google/genai`         | Gemini AI                     |
| `langsmith`             | AI tracing                    |
| `jsonwebtoken`          | JWT signing/verification      |
| `bcryptjs`              | Password hashing              |
| `zod`                   | Schema validation (shared)    |
| `react-router-dom`      | Client-side routing           |
| `react-markdown`        | Render AI markdown responses  |
| `@tanstack/react-query` | Server state management       |
| `vite`                  | Frontend build tool           |
| `vitest`                | Unit testing                  |
| `playwright`            | E2E testing                   |
| `prisma`                | Schema management for MongoDB |

## Omitted from map

- `.git/`, `node_modules/`, `dist/`, `.venv/`
