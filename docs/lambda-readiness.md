# Lambda readiness review

The selected target is S3/CloudFront plus API Gateway/Lambda. The realtime migration now supplies HTTP/WebSocket handlers, durable connections/call membership, scheduled realtime cleanup and a SAM template. Follow [the current implementation and deployment guide](serverless-realtime.md) for validation and the remaining work. The findings below are the earlier audit, before that migration.

Reviewed 2026-10-14 against the current source and `.env.example`. The real `.env` was not read.

The current application is not ready for a conventional API Gateway/Lambda deployment. This review does not deploy or migrate it.

| Practice from the screenshots | Current finding                                                                                                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Separate business logic       | Routes, services, models, and `createApp()` already separate responsibilities.                                                                                                                             |
| Modular functions             | Existing service functions are reusable. A Lambda entrypoint/adapter is missing.                                                                                                                           |
| Stateless functions           | Accounts, sessions, OTP attempts, and OTP cooldowns use MongoDB. Socket rooms, presence, call timers, mail outbox, and general rate limits remain process-local.                                           |
| Include only what is needed   | No reproducible Lambda package exists. Server and browser dependencies currently share package.json. Bundle the server separately and exclude client assets, tests, secrets, and development dependencies. |
| Logging statements            | Startup, DB failures, application errors, mail failures, and worker failures are logged. General request correlation and structured production request logs are missing.                                   |
| Return codes                  | Centralized HTTP response helpers and error middleware already return appropriate statuses. A Lambda adapter must preserve responses, cookies, and headers.                                                |
| Environment variables         | Zod validates configuration. The current server loader automatically reads only `.env`. Lambda injects its own environment variables.                                                                      |
| Secrets and reference data    | API keys and database credentials are configurable, but the application does not fetch AWS Secrets Manager values. Deployment/bootstrap integration is needed if using Secrets Manager.                    |
| Avoid recursive code          | No recursive Lambda invocation was found. `api.ts` uses direct fetch for refresh to avoid recursively invoking its own retry wrapper.                                                                      |
| CloudWatch metrics            | Application metrics are business reports, not Lambda operational metrics. Configure execution-role logging permissions, error/throttle/duration alarms, and meaningful custom metrics.                     |
| Reuse execution context       | Module-level Mongo client state already supports reuse. A handler should await shared initialization rather than reconnecting or closing Mongo per invocation.                                             |

AWS recommends durable state, resource reuse, controlled packaging, and secure configuration in its [Lambda best practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html) and [application design guidance](https://docs.aws.amazon.com/lambda/latest/dg/concepts-application-design.html).

## Deployment blockers

1. `src/server/index.ts` starts `app.listen()` and attaches Socket.IO. There is no Lambda handler, web adapter, or deployment definition. Add a supported HTTP integration and verify proxy headers, cookies, error handling, and initialization.
2. Socket.IO rooms/presence and call expiry timers need an always-running realtime service or a deliberate replacement using managed WebSocket connections. An ordinary Lambda HTTP integration cannot preserve the current server process. The client currently connects to `/socket.io` on its own origin.
3. Appointment reminders, appointment completion, OSM refresh, and book moderation depend on background scanners. Move them to scheduled or queued workers with durable claims and retries. Mongo book leases and reminder claims already provide useful safeguards.
4. Professional submissions allow 8 MB JSON and books allow 10 MB PDFs. These exceed the ordinary Lambda synchronous request/buffered response allowance of 6 MB. Base64 and event wrappers add overhead. Use private S3 uploads/downloads with authorization and signed URLs, or lower limits based on the chosen integration. [AWS quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html).
5. `build:server` runs `tsc` with `rootDir: src`, emitting `dist/server/server/index.js`. `start` points to `dist/server/index.js`, an existing bundled artifact that this build does not regenerate. Raw tsc output also retains extensionless ESM imports and `@shared` aliases. Establish a clean server bundle and smoke-test its actual entrypoint before packaging.
6. Auth/general/chat/message IP rate limits use in-memory counters. Use a shared rate-limit store and/or suitable gateway controls. The one-minute OTP cooldown, code expiry, and verification attempts already use MongoDB and do not have this issue.
7. Verify deployment networking can reach MongoDB Atlas, Resend, Google AI, and OAuth providers. Atlas access controls must permit the deployment network. VPC placement needs deliberate outbound access for these calls.
8. Existing CI contains obsolete Python/backend commands and Node 20 settings. Align it with the actual Node application and the supported runtime before relying on it as a release gate.

No production filesystem writes were found in the reviewed paths. The diagnostic file logger is development-only. No clean Lambda build or live AWS deployment was performed.

## Local and production environment files

- The planned public website is `https://vetify.page`, with Caddy on Lightsail forwarding `/api/*` and `/socket.io/*` to Node on port 8000. These DNS/HTTPS routes are not yet deployed. A separate `api.vetify.page` origin is unnecessary initially.
- For that routing, `CLIENT_ORIGIN` and `SERVER_URL` both use `https://vetify.page`. Provider callbacks use `https://vetify.page/api/v1/auth/<provider>/callback`. The production sample reflects these addresses.
- Verify `vetify.page` in Resend before enabling the sample sender addresses. Domain registration alone does not configure HTTPS, hosting, or email delivery.
- Keep local development in `.env`.
- Copy `env.prod.example` to `env.prod` for a private production reference/build input. The actual production file is ignored by Git.
- Replace example domains with the real HTTPS website/API addresses. `CLIENT_ORIGIN` is an origin without a path. `SERVER_URL` must match provider callback registration and should not end in a slash.
- The current server does not automatically select `env.prod`. For deployed Lambda, supply the server settings through function configuration or a bootstrap that fetches secrets before importing the application. Do not package local `.env`.
- Node's `--env-file=env.prod` can supply the production file explicitly to a build command. For the existing frontend tool: `node --env-file=env.prod node_modules/vite/bin/vite.js build`. This does not make the backend Lambda-ready.
- Vite automatically recognizes `.env.production` for its usual production mode or `.env.prod` with `--mode prod`; it does not automatically recognize `env.prod`. Only `VITE_` variables belong in the browser bundle, and their values are baked in during build. [Vite environment documentation](https://vite.dev/guide/env-and-mode).
- `VITE_API_URL=/api/v1` requires production routing from the website to the API. If using a direct API subdomain, set its full HTTPS URL and deliberately route/configure realtime too. Keep the website and API on the same HTTPS site for the current SameSite=Lax cookie flow. Unrelated hosting domains require cookie/auth changes.
- Register Google/Facebook/TikTok production callbacks as `SERVER_URL/api/v1/auth/<provider>/callback`. Leave unused provider credentials blank. HTTPS alone does not complete provider app review or registration.

## Production values to supply

- Main Vetify MongoDB URI with an explicit `/vetify` database and appropriately scoped production credentials. Do not accidentally use the Meal Planner cluster for website accounts.
- A strong production `JWT_SECRET_ACCESS`, a separate `OAUTH_STATE_SECRET`, and `GEMINI_API_KEY`. Keep signing secrets consistent across production instances and separate from local secrets.
- Separate `AUTH_MAIL_API_KEY` and `MAIL_API_KEY`. Both mail transports must be `http`; log transport sends nothing and can expose codes/invitation links in logs.
- Real verified `AUTH_MAIL_FROM` and `MAIL_FROM` sender addresses. Resend's `onboarding@resend.dev` sender is restricted to testing with your own address. [Resend restrictions](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).
- Production OAuth application credentials for enabled providers. Optional TURN credentials if the call relay is required.
- Public frontend `VITE_API_URL` and optional `VITE_CARTO_KEY` at build time. Never prefix server secrets with `VITE_`.

Lambda environment variables have a combined 4 KB limit. AWS recommends Secrets Manager for sensitive credentials; the current application needs those values resolved into its supported configuration before startup. Do not place literal secret ARNs where the code expects API keys, and do not use `${OTHER_VARIABLE}` references in Lambda values because AWS treats them as literal strings. [AWS environment configuration](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html).
