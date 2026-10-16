# Main Vetify technical design

Updated 14 October 2026. Main ownership is defined by [PRD](PRD.md).
The target is documented separately from current implementation state.

## Stack and entry points

| Layer               | Implementation                                                  |
| ------------------- | --------------------------------------------------------------- |
| Client              | React 18, Vite, TypeScript, React Router, React Query, Tailwind |
| HTTP API            | Express 5 and TypeScript, `/api/v1`                             |
| Validation          | Zod/shared contracts in `src/shared/`                           |
| Database            | Official MongoDB driver and explicit indexes                    |
| Local realtime      | Socket.IO on the HTTP server                                    |
| Production realtime | API Gateway WebSockets, Mongo-backed tickets/leases             |
| Calls               | Browser WebRTC, TURN when needed                                |
| AI                  | Gemini with existing tracing/moderation integration             |
| Tests               | Vitest, isolated MongoDB fixtures and Playwright                |

`src/server/app.ts` creates Express without listening. `index.ts` owns local
startup, Socket.IO and interval jobs. `src/server/lambda/` contains separate
HTTP, WebSocket and maintenance entry points. Database initialization is reused
per Lambda execution environment; request-specific state must not leak.
No active Prisma schema-management step is part of this architecture.

## Main ownership

Main retains accounts/auth identities, verification/linking challenges, browser
and native sessions, subscription authority, professional inquiries/profiles,
clinics, appointments, messages, notifications, admin audits and realtime state.
Only main knows credentials and provider connections.
Blog UI, APIs, moderation, model exports and indexes are removed from main.
Main metrics no longer query Blog data. Historical Blog audit entries remain readable.

## Authentication

Browser authentication uses short-lived bearer access tokens and hashed opaque
refresh credentials in a Secure/HttpOnly production cookie. Refresh rotation
has concurrent-request handling; preserve session revocation and storage sync.
Main authorization rechecks current status/role/ownership where required.
Email signup uses six-digit codes, five-minute expiry and sixty-second resend
cooldown; replacing a code invalidates its predecessor.
Provider linking is explicit, with verification/reauthentication proof.

Native auth/session handoff and Planner QR stay in main. Current introspection
returns version 1, identity/status, region/subscription and short validity.
The sibling Planner currently requires version 2; coordinated checks for
issuer/audience, verified email and session revocation remain pending.
External browser SSO also requires a reviewed client/code/PKCE flow. A broad
parent-domain refresh cookie or shared symmetric signing secret is not the design.
Books needs trusted current professional approval, not only a role string.

## Realtime and calls

Verified main browsers obtain a thirty-second single-use realtime ticket.
Gateway connections check Origin and account/session validity. Tickets are opaque
and hashed at rest; access JWTs do not enter connection URLs.
Mongo stores connections, authorization deadlines and call membership.
Ready/heartbeat/renewal/reconnect preserve the local event/acknowledgement contract.
Call joins enforce appointment participation and the allowed time window.
SDP/ICE and ephemeral call events go only to authorized room members.
Maintenance cleans stale leases; media remains WebRTC, outside API Gateway.
See [realtime design](serverless-realtime.md) for actual handlers and limits.

## Target main production topology

Private frontend S3 is served through CloudFront OAC at `https://vetify.page`.
CloudFront forwards `/api/*` to HTTP API Gateway with caching disabled and the
required headers/cookies/query values. Lambda uses the existing Express adapter.
WebSockets use their direct WSS gateway address. A viewer-request SPA rewrite
belongs only to the default S3 behavior; API errors stay API responses.
Private professional proof uploads need a separate bucket and authorized signed
operations. Main upload API changes are pending, not already deployed storage.

Secrets Manager values feed the current SAM Lambda configuration. Private `.env`
is local. Ignored `env.prod` provides public VITE build values. Never expose
MongoDB URIs, JWT secrets, mail/provider keys or private proofs in the browser.
Database network access and production least-privilege credentials need review.

## Background work

Local startup starts appointment reminders, completion, delivery retries and
clinic refresh. Lambda timers are not persistent schedulers.
Current Lambda maintenance performs realtime cleanup only. Main production
needs durable/scheduled appointment jobs with idempotency, retries and logging.
Books' scanner, indexes, PDF worker and PDF.js dependency have been removed
from main. Anatomy UI/assets are also removed; independent copies are preserved.

## Implementation status and verification

Implemented: browser/native account foundations, code verification, explicit
linking, professional/appointment workflows, local realtime and Gateway adapters.
Earlier focused auth/realtime, packaged Lambda and browser media checks passed.
The full suite has known failures and does not establish all-green readiness.
Not completed: main-only extraction, private production uploads, durable main
jobs, Planner v2 compatibility, external web SSO and live AWS/TURN acceptance.

Run relevant tests after runtime changes. Verify main can start and render while
every feature service is absent, and cannot initialize feature collections.
See [command reference](commands.md), [release gates](masterplan.md) and
[AWS acceptance](main-deployment/aws-acceptance.md).
