# Vetify — Masterplan

## Phase Overview

| Phase | Focus                                              | Status         |
| ----- | -------------------------------------------------- | -------------- |
| 1     | Foundation — monorepo, Express, MongoDB            | ✅ Done        |
| 2     | Auth — JWT + httpOnly refresh cookie               | ✅ Done        |
| 3     | AI Chat — Gemini + LangSmith                       | ✅ Done        |
| 4     | Frontend — React + Vite, React Router, Chat UI     | ✅ Done        |
| 5     | Testing — Vitest unit tests, Playwright E2E        | 🔄 In progress |
| 6     | Deployment — S3 + CloudFront, API Gateway + Lambda | ⏳ Planned     |

---

## Phase 1 — Foundation

- Vite + React + Express monorepo under `src/client/` and `src/server/`
- Shared Zod schemas in `src/shared/schemas.ts`
- MongoDB Atlas via Mongoose
- Prisma for schema management (`npx prisma db push`)
- `nodemon` + `concurrently` for local dev

## Phase 2 — Auth

- Custom JWT auth — short-lived access token + long-lived refresh token
- Refresh token stored hashed in MongoDB (`RefreshToken` model), sent as httpOnly cookie
- Client stores `{ accessToken, user }` in `localStorage` under `vetify.auth`
- Endpoints: `POST /api/v1/auth/signup`, `/login`, `/refresh`, `/logout`
- Zod validation on all auth routes via `validate` middleware

## Phase 3 — AI Chat

- `POST /api/v1/chat` → Express → `@google/genai` (Gemini)
- Model whitelist enforced server-side via `chatRequestSchema`
- LangSmith tracing for monitoring AI responses
- System prompt includes safety rules, scannability rules, length rules
- Conversation history passed per request (stateless server)

## Phase 4 — Frontend

- React + Vite + TypeScript + Tailwind CSS
- React Router for client-side routing
- `ChatWindow.tsx` — full chat UI with edit, cancel, model selector, markdown rendering
- `react-markdown` for rendering AI responses
- `AbortController` for cancelling in-flight requests
- Custom auth lib (`src/client/lib/auth.ts`) — no NextAuth/Supabase

## Phase 5 — Testing (In Progress)

- Vitest for unit tests (`src/client/__tests__/`, `src/server/models/__tests__/`)
- Playwright for E2E tests (`tests/e2e/`)
- `mongodb-memory-server` for isolated server tests
- CI in `.github/workflows/ci.yml` (currently disabled during active development)

## Phase 6 — Deployment (Planned)

- Frontend: `npm run build:client` → upload `dist/` to S3 → serve via CloudFront
  - CloudFront error pages: 403/404 → `/index.html` (200) for React Router support
- Backend: wrap Express with `@vendia/serverless-express` → deploy to Lambda → API Gateway (HTTP API)
- Custom domains: `yourapp.com` (CloudFront) + `api.yourapp.com` (API Gateway) — required for httpOnly cookies
- Secrets: `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY` stored in Lambda env vars (encrypted)
- `VITE_API_URL` baked into the client build at deploy time
