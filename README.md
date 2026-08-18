# Vetify

A pet care web app — AI chat assistant, vet locator, meal planner, and anatomy viewer.

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, React Router
- Frontend hosting: S3 + CloudFront
- Backend: Express (Node.js, TypeScript)
- Backend hosting: API Gateway + Lambda
- Database: MongoDB Atlas (official `mongodb` Node.js driver)
- Auth: Custom JWT — access token + httpOnly refresh cookie
- AI: Google Gemini (`@google/genai`), LangSmith tracing
- Validation: Zod (shared between client and server)
- Testing: Vitest, Playwright

## Project Structure

```
src/
├── client/       # React + Vite frontend
├── server/       # Express backend
└── shared/       # Zod schemas shared by both
```

## Quick Start

### Prerequisites

- Node 18+
- npm

### Development

```bash
npm install
npm run dev        # starts client (Vite) + server (Express) concurrently
```

Client runs on `http://localhost:5173`, server on `http://localhost:3000`.

### Individual

```bash
npm run dev:client   # Vite only
npm run dev:server   # Express + nodemon only
```

### Build

```bash
npm run build        # builds client (dist/) and server (dist/server/)
npm run start        # runs built server
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
MONGODB_URI=
JWT_SECRET=
GEMINI_API_KEY=
ACCESS_TOKEN_MINUTES=
REFRESH_TOKEN_DAYS=
```

Generate a secure `JWT_SECRET` (must be 32+ characters):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output as the value of `JWT_SECRET` in your `.env`.

## Database

MongoDB Atlas through the official `mongodb` driver — no ODM. `src/server/config/db.ts`
owns a single `MongoClient`; each file under `src/server/models/` exports a typed
collection accessor, a Zod schema for its attributes, and its index list. The
server calls `ensureIndexes()` once at boot, so indexes are created explicitly
rather than lazily.

## Testing

```bash
npm run test              # all Vitest unit tests
npm run test:client       # client tests only
npm run test:server       # server tests only
npm run test:coverage     # with coverage report
npm run test:e2e          # Playwright E2E tests
```

## Linting & Formatting

```bash
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run typecheck    # TypeScript type check
```

Husky runs `prettier` on staged files automatically on every commit.

## CI

CI lives in `.github/workflows/ci.yml` and runs tests only.

CD and deployment are not configured yet.
