# Main Vetify architecture

Updated 14 October 2026. This is main's architecture and its external interfaces.
Independent feature implementation details live in their own repositories.

![Agreed target architecture](main-deployment/architecture.png)

The picture is a target boundary, not proof of extraction or AWS deployment.

## Main runtime

```mermaid
flowchart LR
    Browser[Main browser] --> CF[CloudFront]
    CF --> S3[Private main frontend S3]
    CF --> HTTP[HTTP API Gateway]
    HTTP --> API[Main Express Lambda]
    Browser <--> WS[WebSocket API and Lambda]
    API --> DB[(Main MongoDB Atlas)]
    WS --> DB
    Jobs[Scheduled main jobs] --> DB
    API --> Mail[Resend]
    API --> AI[Gemini]
    Browser <--> Peer[WebRTC peer or TURN relay]
```

Only signalling/presence/message events travel through the WebSocket API.
WebRTC media uses the peer/relay connection. Scheduled main appointment jobs
and private upload handling are required additions to the current template.
Local development uses Vite's proxy and persistent Socket.IO instead of gateways.

## Ownership

| Main component        | Owns                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| Identity              | Users, passwords, provider links, verification/recovery and sessions |
| Professional services | Applications, proof, approval, profiles and discovery                |
| Consultations         | Appointment state, slots, reminders, reviews and call rights         |
| Communications        | Conversations, messages, notifications and realtime leases           |
| AI guidance           | Main assistant validation, allowance, provider and moderation        |
| Administration        | Account controls, application decisions, main audits/metrics         |

External Planner, Books, Anatomy and Blog have separate feature data and hosting.
They receive identity/capabilities via main APIs, not direct main database access.
The actual Blog sibling folder is `vetify-blogs`; its proposed public host is
`blog.vetify.page`. Future destinations are not yet DNS or deployment facts.

## Key source locations

- `src/client/App.tsx`: main and currently embedded feature routes.
- `src/client/routes/console-routes.tsx`: professional/admin console routes.
- `src/server/app.ts`: Express composition and request middleware.
- `src/server/index.ts`: local listen/startup and interval jobs.
- `src/server/routes/v1/`: versioned main HTTP API composition.
- `src/server/models/`: typed Mongo collections, queries and indexes.
- `src/server/realtime/`: local events, Gateway delivery, durable sessions/calls.
- `src/server/lambda/`: HTTP, WebSocket and maintenance adapters.
- `src/shared/`: shared validation/contracts, including mixed legacy feature definitions.
- `deploy/serverless/template.yaml`: main backend SAM resources.
- `scripts/build-lambda.mjs`: bundled handlers and runtime dependency lockfile.

## Authentication boundary

Main browser refresh credentials remain host-only and HttpOnly. Native/Planner
session handoff and account QR also belong to main. Matching provider emails do
not automatically merge accounts; linking authenticates ownership explicitly.
External web sign-in requires registered callbacks and authorization-code/PKCE
integration with app-specific sessions. Keep main signing/social secrets private.
Current main introspection is version 1; Planner's required version 2 is pending.
See [the central contract](main-deployment/shared-auth.md).

## Main-only deployment boundary

Books/Anatomy code and assets are removed. Main retains protected launch pages.
Main still bundles Planner/Blog and mounts their data APIs.
Deleting only navigation or documentation does not separate them.
Main account export and dashboard metrics read feature data; indexes and the
Books worker/scanner are removed. Preserve shared native auth, region
helpers and professional MediaPipe proof while removing feature-specific roots.
See [the extraction checklist](main-deployment/extraction-checklist.md).

Main should remain usable while external features are down. Missing destinations
show unavailable states; optional feature aggregates cannot block admin pages.
Retain immutable main user IDs during any reviewed feature-data migration.

For the exact AWS order, use [the deployment guide](main-deployment/README.md).
