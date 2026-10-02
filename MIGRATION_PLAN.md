# Vetify Migration Plan: Microservices Split and Shared Subscription

## 1. What this document is

A sequenced plan to evolve Vetify from one app into a main hub plus independently deployed feature apps, with one shared login and one shared subscription. It records decisions, the current state of the code, the target state, and the order of work. It is a living plan, not a finished spec. Update it as phases land.

Not in scope here: payment provider choice, native app framework choice, and final DNS and hosting runbooks. These are flagged where they matter and left open in section 19.

## 2. Goal and firm decisions

- Architecture: a main system plus feature apps, each feature in its own repository (polyrepo).
- Reason: fault isolation. One feature going down must not take the rest down.
- Hosting: main system on AWS. Feature apps on Vercel.
- Subdomains: vetify.com (main), anatomy.vetify.com, planner.vetify.com, book.vetify.com, more later.
- Login is shared across all of them. One account.
- Subscription is shared across all of them. A pro plan bought once unlocks pro features everywhere, including an installed app.
- Anatomy requires login. It is not public.
- Meal planner will also ship as an installed application, with pro features gated by subscription.

## 3. Concepts to keep straight

- Fault isolation comes from separate deployments and separate databases, not from separate Git repos. Repos are a code-storage choice. Separate running services with their own databases keep one outage from spreading.
- One source of truth. Identity (user accounts) and subscription state live in exactly one place, the main system. Every other app reads them from the main API. Copying them into a feature database creates two versions of the same fact that drift and open security holes (a stale "pro" means free access).
- Enforce on the server. A feature app, especially an installed one, runs on the user's device and cannot gate itself. Client gating is cosmetic. The API is the gate.
- Dependency runs one way. Features depend on the main system for identity and entitlement. The main system does not depend on features. A feature outage leaves the main system fine, which is the isolation goal.

## 4. Current state (as of this document)

Stack: React + TypeScript SPA (Vite), Express + MongoDB raw driver (no ODM), Zod schemas shared across client and server, socket.io, Tailwind. Philippine market (peso canonical, +63 phone, Manila timezone).

Build: one npm package, not workspaces. `vite build` produces dist/client. `tsc -p tsconfig.server.json` produces dist/server. Express mounts only `/api` and does not serve the SPA. Dev uses the Vite proxy for `/api` and `/socket.io`. Nothing is deployed yet and the CI workflow is stale.

Auth, relevant files:

- Access token: JWT HS256, signed in src/server/services/auth.service.ts (signAccessToken). Claims are sub, email, role. Lifetime ACCESS_TOKEN_MINUTES (default 15). Sent as a Bearer header. HS256 is symmetric, the same secret signs and verifies, which matters for the split (section 8).
- Refresh token: opaque random, SHA-256 hashed and stored in Mongo, lifetime REFRESH_TOKEN_DAYS. Set as an httpOnly cookie by refreshCookieOptions (auth.service.ts, around L68). Flags httpOnly, secure in production, sameSite lax. No domain, so the cookie is host-only today. This is the subdomain-login blocker.
- Refresh does not rotate. POST /auth/refresh mints a new access token and reuses the same refresh cookie (src/server/routes/v1/auth.route.ts).
- CORS allows a single origin, env.CLIENT_ORIGIN, credentials true (src/server/middleware/security.ts, around L26). The socket server has no CORS block. The file comment already notes native apps bypass the dev proxy and need CORS.
- Authorization: requireRole re-reads the user from the database every call and checks account status (src/server/middleware/requireAuth.ts). Roles are user, professional, admin. No subscription or plan concept yet.
- Client: access token and user live in localStorage under key vetify.auth, per origin (src/client/lib/auth-storage.ts). API base URL is VITE_API_URL or /api/v1, and it refreshes once on a 401 then replays (src/client/services/api.ts). On load the app trades the refresh cookie for an access token via refreshSession (src/client/lib/auth.ts).

Features:

- Anatomy: client only, static data. src/client/pages/anatomy and src/client/types/anatomy.ts. Routed behind the login gate. No server route or database.
- Meal planner: now initialized, no longer a stub. Client pages in src/client/pages/planner (planner-page, plan-wizard, plan-review, plan-schedule, plan-view, plan-progress). Client service src/client/services/meal-plans.service.ts. Server route src/server/routes/v1/meal-plans.route.ts. Shared logic src/shared/meal-plans.ts, meal-calculation.ts, nutrition-observations.ts. Data currently in the main database.
- Books: does not exist yet. Greenfield. Needs its own backend, file storage, and database. Uploads gated to professional and admin roles.

Shared code: src/shared/schemas.ts and src/shared/limits.ts, imported widely across client and server. Candidates for a published @vetify/shared package once more than one repo needs them.

## 5. Target architecture

Main system (AWS, vetify.com): owns identity, sessions, subscriptions, and the features that stay in the monolith. Exposes the only authoritative auth and entitlement API. Keeps its own database.

Feature apps (Vercel, subdomains), each its own repo and deployment:

- anatomy.vetify.com: static SPA, no backend, no database. Gated by login. Reads identity from the main API.
- planner.vetify.com and the installed meal planner app: SPA plus optional own backend and own database for meal data. Pro features gated by subscription checked against the main API.
- book.vetify.com: full service, own backend, own database, file storage. Uploads gated by role.

Shared package (@vetify/shared): the Zod schemas and limits both the main system and features need. Published to a registry (npm private or GitHub Packages) and pinned. Feature-specific logic such as meal calculation does not go here, it moves with its feature.

Topology:

```
Browser / Installed app
   |
   |  every app authenticates and checks entitlement against the main API
   v
+-------------------------------------------------------------+
|  main API  (AWS, vetify.com)  identity + billing + main DB  |  <- hub
+-------------------------------------------------------------+
   ^              ^                  ^                 ^
   |              |                  |                 |
anatomy.       planner.           book.            installed
vetify.com     vetify.com         vetify.com       app
Vercel SPA     Vercel SPA + API   Vercel API       (same API calls)
no DB          planner DB         books DB + files
```

Everything points at the main API. Nothing points at a feature.

## 6. Data ownership

- Identity (users) and subscription state: main database only. Single authority.
- Feature data may live in the feature's own database. Meal data (plans, schedules) can move to a planner database. Books data and files go in the books service database and object storage. Anatomy has no data to own.
- Cross-service references store the main user id as a plain field. Do not join across databases. The current code uses $lookup joins that assume one database, those stop working once a feature has its own database, so the feature resolves the user and entitlement by calling the main API and caches the answer briefly.

## 7. Shared login across subdomains

Browser flow:

- Same-site subdomains under .vetify.com share a cookie when the cookie domain is .vetify.com. sameSite lax already suffices, no sameSite none needed.
- Log in on vetify.com, the server sets the refresh cookie on .vetify.com, the browser keeps it for every subdomain. A feature SPA loads with no token of its own (access tokens are per origin), calls /auth/refresh on the main API on load, the browser sends the shared cookie, the API returns an access token, the SPA stores it for its own origin. No second login.
- A logged-out visitor to a gated feature is redirected to the main login with a returnTo that points back to the feature subdomain. Validate returnTo against an exact host safelist, or it becomes an open redirect that phishers abuse.

Installed app flow (no shared browser cookie):

- The app logs in against the main API with the same credentials and stores tokens in device secure storage (Keychain on iOS, Keystore on Android), not plain preferences.
- Every call carries the token. The server identifies the user and checks subscription per request.

Cross-origin plumbing this needs:

- CORS on the main API must reflect each specific feature origin with credentials true. The wildcard is rejected by browsers once credentials are in play.
- Preflight (OPTIONS) must return the same allowlist, or the browser blocks the real request.
- socket.io needs its own CORS allowlist, separate from Express CORS, and the client keeps sending the token in the handshake.

## 8. Token verification across services

Only matters for features that run their own backend (meal planner service, books service). Anatomy has no backend, so the main API verifies when anatomy calls it, nothing to add there.

The access token is HS256 today, one secret both signs and verifies. A feature backend that verifies a main-issued token locally would need that same secret, and a leak on any one service would let an attacker mint tokens, not just read them. Three ways to handle it:

- Introspection (start here). The feature backend does not verify locally. It calls the main API once per request to resolve identity and entitlement, and caches the answer for a short window. The feature already has to ask main for entitlement (subscription is not in the token), so this is one call doing both. Simple, no secret sharing, costs a network hop.
- Asymmetric keys (later). Switch access tokens to RS256. Main holds the private key and signs. Each feature holds only the public key and verifies locally, no hop. A leaked public key cannot mint tokens. Expose a JWKS endpoint on main for rotation. Do this when the per-request hop becomes a bottleneck.
- Shared secret (avoid). Hand every service the HS256 secret. Largest blast radius.

## 9. Logout and session revocation

- Logout must clear the refresh cookie with the same domain (.vetify.com) it was set with, or the clear misses and the cookie survives. Mirror the domain on every clearCookie.
- Clearing the shared cookie stops all subdomains from minting new access tokens. Already-issued access tokens still work until they expire, up to ACCESS_TOKEN_MINUTES per origin. That short window is the tradeoff for stateless access tokens, and it is acceptable.
- Suspend or ban already revokes refresh tokens server-side. With introspection (section 8) a ban also cuts feature access within the cache window. With local verification it waits for token expiry, another reason to keep the access token short.

## 10. Subscription and entitlement (new)

Does not exist yet. Separate from role. A user can be role user and plan pro at the same time.

Model: store plan, status (active, expired, cancelled), and expiry. Either a field group on the user document or a small subscriptions collection keyed by user id. A subscriptions collection is cleaner for history and renewals.

Enforcement:

- Add a requireActivePlan middleware shaped like the existing requireRole in src/server/middleware/requireAuth.ts. Read the subscription from the database per request. Do not bake the plan into the 15-minute access token, or a cancellation keeps working until the token expires.
- Put pro endpoints behind it. Not subscribed returns 402 or 403.
- GET /me or the auth bootstrap returns the plan so apps can show or hide pro UI. UI only, the server still enforces.
- Expose a small entitlement endpoint (for example GET /entitlements) that feature backends call, returning plan and status for the token's user. This is the introspection target from section 8.

Setting plan to pro: day one a manual flag set by an admin, later a payment provider webhook. The provider choice is open and does not change the design.

## 11. Sequencing

Build the features in this one repo first, deploy the main app, split last. Splitting early taxes every shared-code change across repos while features churn. Splitting late is mechanical file-moving that does not get harder by waiting. The real unlock for the microservice goal is deployment, not the split.

## 12. Phased execution

Phase 0, finish features in-repo. Keep building anatomy and meal planner and start books inside the current repo. One repo is easier to navigate while features churn. Rollback: none needed, normal work.

Phase 1, backend cross-subdomain login enablers (feature branch on the main repo).

- Add COOKIE_DOMAIN env. Empty locally, .vetify.com in production.
- Set the cookie domain in refreshCookieOptions (auth.service.ts) and mirror it on every clearCookie in auth.route.ts.
- Turn CORS into an allowlist in security.ts and add CORS to the socket server. Allow the main origin and feature subdomains.
- Make the login page accept a returnTo to an exact-match \*.vetify.com host from a safelist.
- Side effect: changing the cookie domain logs existing sessions out once. One time, acceptable.
- Verify locally with fake subdomains (hosts file app.localhost and anatomy.localhost, cookie domain .localhost).
- Rollback: revert the env and the two cookie edits, sessions re-pin to host-only.

Phase 2, subscription and entitlement.

- Add the subscription model and requireActivePlan middleware.
- Gate the meal planner pro endpoints (meal-plans.route.ts) on the main server, before any split.
- Return plan in the auth bootstrap and add GET /entitlements.
- Admin flag to set pro for testing.
- Rollback: leave the model in place, remove the gate to restore open access.

Phase 3, deploy main to AWS.

- Host the main system under vetify.com and the API under a stable host with HTTPS. Required before real cross-subdomain login can be tested.
- Set COOKIE_DOMAIN=.vetify.com and the CORS allowlist in production.
- Add health checks and basic request logging, replace the stale CI workflow.

Phase 4, anatomy pilot (separate SPA on Vercel).

- New repo, Vite SPA. Move src/client/pages/anatomy and src/client/types/anatomy.ts.
- Bring the minimal auth glue (auth-storage, api client, refreshSession, a RequireAuth gate).
- On load, call /auth/refresh against the main API. If not authed, redirect to the main login with returnTo back to anatomy.
- Set VITE_API_URL to the absolute main API URL. No backend, no database.
- Point anatomy.vetify.com DNS at Vercel. Verify SSO end to end.
- Rollback: keep the /anatomy route live in the main app until the subdomain is proven, then remove it.

Phase 5, meal planner as app and service.

- Decide whether the planner keeps the main database or moves meal data to its own planner database. If it moves, follow section 14.
- Move the planner client (src/client/pages/planner, meal-plans.service.ts) and the planner-specific shared logic (meal-plans.ts, meal-calculation.ts, nutrition-observations.ts) into the planner repo.
- The planner backend authorizes with introspection (section 8) and gates pro features with the entitlement check.
- Ship the installed app from the same codebase, tokens in device secure storage, same entitlement checks.
- Rollback: keep the main-server route until the service is proven.

Phase 6, books (greenfield service).

- New repo and service, own backend, own database, object storage for files (section 15).
- Authorize with introspection, gate uploads to professional and admin.

Phase 7, @vetify/shared extraction.

- Extract src/shared/schemas.ts and src/shared/limits.ts into a published package once a second repo consumes them. Pin the version and pin zod as a shared runtime dependency. Treat a schema change as a breaking change that ripples to every consumer, so version it.

## 13. Environment variables

Main system (new or changed):

- COOKIE_DOMAIN: empty locally, .vetify.com in production. New.
- CLIENT_ORIGIN: becomes an allowlist of origins, not one string. Changed.
- JWT_SECRET_ACCESS: unchanged for HS256. If moving to RS256, replace with a private key plus a published public key or JWKS.
- Existing: PORT, MONGODB_URI, REFRESH_COOKIE_NAME, ACCESS_TOKEN_MINUTES, REFRESH_TOKEN_DAYS, OAuth redirects, DNS_SERVERS (dev-machine workaround).

Each feature app:

- VITE_API_URL: absolute URL of the main API.
- VITE_LOGIN_URL: absolute URL of the main login, for the redirect.

Feature backends (planner, books):

- MAIN_API_URL: where to introspect identity and entitlement.
- Own database URL and, for books, object-storage credentials.

## 14. Data migration and cutover

Only when a feature moves off the main database (planner meal data, later anything else).

- Add the feature database and point the feature service at it.
- Backfill: copy existing documents, rewriting the user reference to the plain id field.
- Dual-write briefly if the feature is live, so nothing is lost during the copy, then cut reads over, then stop writing to the old location.
- Verify counts match before deleting the old collection. Keep a backup until verified.
- Anatomy and books need no backfill. Anatomy has no data, books is greenfield.

## 15. Books service specifics

- Own backend and database. Each book record stores the uploader user id, title, metadata, and a storage key.
- Files go in object storage (for example S3-compatible), not the database. Serve through time-limited signed URLs, do not make the bucket public.
- Enforce a max file size and an allowed content-type list. Reject anything else before it reaches storage.
- Uploads gated to professional and admin, checked server-side with the role from introspection.
- Reads are for logged-in vet students. Gate reads behind login like anatomy.

## 16. Account lifecycle across services

- Deleting or anonymizing a user in the main system must reach feature data that references them. Either cascade (the feature exposes a delete-by-user hook the main system calls) or mark the reference orphaned.
- Do not leave meal plans or uploaded books tied to a user id that no longer exists with no plan to clean them up.
- Decide this before books ships, since uploaded files are the hardest to track down later.

## 17. File map

- Cookie domain: src/server/services/auth.service.ts (refreshCookieOptions), src/server/config/env.ts (new COOKIE_DOMAIN), src/server/routes/v1/auth.route.ts (clearCookie calls).
- CORS allowlist: src/server/middleware/security.ts, src/server/realtime/socket.ts (add CORS).
- returnTo safelist: the main login page under src/client/pages and the auth success redirect.
- Subscription: new model under src/server/models for the subscriptions collection, new requireActivePlan in src/server/middleware/requireAuth.ts, GET /entitlements route, gate in src/server/routes/v1/meal-plans.route.ts.
- Anatomy lift: src/client/pages/anatomy, src/client/types/anatomy.ts, plus copies of src/client/lib/auth-storage.ts, src/client/services/api.ts, src/client/lib/auth.ts.
- Planner lift: src/client/pages/planner, src/client/services/meal-plans.service.ts, src/shared/meal-plans.ts, src/shared/meal-calculation.ts, src/shared/nutrition-observations.ts, src/server/routes/v1/meal-plans.route.ts.

## 18. Risks and gotchas

- Changing the cookie domain logs everyone out once.
- No ODM, raw driver only. Projections must drop the password hash, it is unsafe-by-default.
- $lookup joins assume one database and break across services. Replace with a main-API call plus a short cache.
- returnTo without a host safelist is an open redirect.
- Sharing the HS256 secret across services widens the blast radius. Prefer introspection or RS256.
- `npm run typecheck` is client only and ignores src/server. Use `npm run build:server` for server type checks.
- lint-staged runs prettier --write on commit and can churn CRLF line endings and bury the real diff.
- An installed app cannot be trusted to gate pro features. Server enforcement is mandatory.
- Cross-subdomain SSO cannot be fully tested on localhost without fake subdomains. It needs real HTTPS domains under .vetify.com to prove in production.

## 19. Open questions

- Payment provider for pro, and whether it supports peso and local methods.
- Native app framework for the installed meal planner (affects token storage specifics only, not the design).
- Final hosting: single main API host or split API and SPA, and the exact API hostname (vetify.com or api.vetify.com).
- Whether the planner moves to its own database in Phase 5 or stays on the main database for now.

## 20. Verification

- Client types: `npm run typecheck`.
- Server types: `npm run build:server`.
- Tests: `npm run test:server` and `npm run test:client`. Run only when core logic changes, not for doc or copy edits.
