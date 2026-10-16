# Vetify main system

Vetify connects pet owners with veterinary guidance and verified professionals.
This repository owns the main website, central accounts, professional onboarding,
clinic discovery, appointments, messaging, video-call signalling and AI assistant.

Meal Planner, Books, Anatomy and Blog belong to separate repositories. Main
provides their account authority and launch links; each owns its feature data.
Books and Anatomy implementations have been removed from this source tree.
Meal Planner now has a public app introduction at `/planner`; its feature code
has been removed. Blog UI, APIs, moderation and database indexing are also extracted.
External entry pages use VITE_BOOKS_ORIGIN, VITE_ANATOMY_ORIGIN and VITE_BLOGS_ORIGIN;
blank values show unavailable states. See [the extraction record](docs/main-deployment/books-anatomy-extraction.md).
Set `VITE_BLOGS_ORIGIN` to the separate Blog app's origin, without a path.
Main `/blogs`, `/blogs/:slug` and `/admin/blogs` open its feed, article and moderation pages.
Blog account authentication is handled by that app. Main passes no credentials in launch URLs.
Current build output is not yet a verified main-only release.

## Local development

Use Node 24 and npm. On Windows, use `npm.cmd` if PowerShell blocks npm.ps1.
Configure local `.env` using `.env.example`; keep credentials private.

```powershell
npm.cmd ci
npm.cmd run dev
```

Client: `http://localhost:5173`. API: `http://localhost:8000/api/v1`.
Vite proxies `/api` and local Socket.IO. The server command explicitly selects
the server TypeScript config so shared imports resolve correctly.

## Architecture and deployment

- React/Vite/TypeScript/Tailwind client and Express/TypeScript API.
- Official MongoDB driver and shared Zod contracts.
- Central password/social authentication, email codes and explicit account linking.
- Local Socket.IO; production API Gateway WebSockets with Lambda handlers.
- WebRTC media, with TURN where direct connectivity fails.
- Selected main hosting: private S3/CloudFront and API Gateway/Lambda.
- `.env` is local; ignored `env.prod` supplies public frontend build settings.
  Production server secrets come from Secrets Manager through the SAM template.

Private main uploads, durable appointment jobs and subsystem extraction need
completion before production launch. Shared external web sign-in is also pending.
Preparing or building code does not establish a live AWS deployment.

## Useful checks

```powershell
npm.cmd run typecheck:client:runtime
npm.cmd run test
npm.cmd run build:lambda
npm.cmd run test:lambda
```

Focused auth/realtime checks passed earlier. The full test suite still has known
failures; report current results and resolve release-relevant failures.
See [commands](docs/commands.md) for frontend/server build and test commands.

## Main documentation

- [Documentation index](docs/README.md)
- [Product requirements](docs/PRD.md) and [technical design](docs/TDD.md)
- [Architecture](docs/architecture.md) and [user flows](docs/flowchart.md)
- [Delivery plan](docs/masterplan.md) and [main business scope](docs/business-idea.md)
- [Extraction and integration plan](MIGRATION_PLAN.md)
- [Main AWS deployment guide](docs/main-deployment/README.md)
- [Implemented realtime design](docs/serverless-realtime.md)

Feature descriptions and setup prompts live in each feature repository. Main
documentation records only their boundaries and interfaces needed by this app.
