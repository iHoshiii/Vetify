# Delivery and maintenance plan

Reviewed 25 October 2026. This plan separates implemented code from deployment
acceptance and future integration work. Read the [audit](main-deployment/repository-cleanup-audit.md)
for the current cleanup results and deferred dependency migrations.

## Current implementation

| Area               | Implemented                                                  | Remaining acceptance or work                                      |
| ------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| Main client/API    | React, Express, MongoDB, shared validation                   | Release artifact and deployed workflow checks                     |
| Accounts           | Browser/native sessions, email codes, explicit linking       | Real inbox/provider and joint app acceptance                      |
| Professionals      | Approval, private per-photo uploads, clinic discovery        | Production access, request-size, and clinic-refresh checks        |
| Consultations      | Appointments, durable deliveries, scheduled maintenance      | Deployed retries, reminders, and cross-network calls              |
| Kupa               | Semantic veterinary scope, social exchanges, Bedrock replies | Re-evaluate after policy/model changes; monitor deployed provider |
| Realtime           | Local Socket.IO and production Gateway adapters              | Two-device, reconnect, authorization, and TURN acceptance         |
| Feature extraction | Planner, Books, Anatomy, and Blog removed from main runtime  | Independent app parity, ownership, and actual package inspection  |
| Web sign-in        | Optional Anatomy and Books OIDC clients                      | Joint deployed acceptance; Blog registration remains separate     |
| Books approval     | Expiring worker credential and current capability lookup     | Joint publication/revocation acceptance                           |
| Planner contract   | Native introspection version 1                               | Coordinate required version 2 with Planner                        |
| Dependency cleanup | Compatible patches and dead-code removal                     | Review and migrate remaining major-version advisories             |

## Main release gates

1. Run relevant lint, types, automated tests, and packaged-runtime checks.
   Investigate failures; preserve evidence with the tested revision.
2. Inspect frontend and backend packages. Exclude credentials, source archives,
   Anatomy assets, PDF workers, and extracted feature runtime roots.
3. Confirm main login, exports, dashboards, booking, and communications work while
   external features are unavailable.
4. Check production database/network access, private proof authorization,
   persistent abuse limits, server secrets, and configured public URLs.
5. Verify real email, social callbacks, worker retries, Kupa responses, and
   cross-network TURN using designated test accounts.
6. Check monitoring, the budget controller, backups, and rollback before release.

Private uploads and scheduled appointment jobs already exist. Their remaining
gate is validation in the deployed environment, not a second implementation.
See [live acceptance](main-deployment/aws-acceptance.md).

## Independent integration work

Main owns immutable account IDs and authentication authority. Feature apps own
their sessions and data. Do not copy passwords, main refresh credentials,
signing keys, or database access into a feature app.

Enable Anatomy or Books only after its configured OIDC integration passes joint
acceptance. Check Books author approval through the separate worker capability
contract. Coordinate Planner v2 before declaring native compatibility. Blog
authentication/admin capability requires its own registration and tests.

Missing or unavailable destinations must leave main usable. Each independent
app needs its own deployment, monitoring, data migration plan, and rollback.

## Deferred major upgrades

The owner selected a safe cleanup pass. Major React Router, Vite/Vitest,
Tailwind, and lint-staged migrations are documented in the [audit backlog](main-deployment/repository-cleanup-audit.md#deferred-major-migrations).
Plan each migration with its relevant routing, browser, build, coverage, styling,
or hook checks. Do not use forced audit upgrades as an unreviewed substitute.

## Operational references

- [Repository ownership](../MIGRATION_PLAN.md) and [extraction acceptance](main-deployment/extraction-checklist.md)
- [Configuration](main-deployment/configuration.md) and [shared auth](main-deployment/shared-auth.md)
- [AWS preparation](main-deployment/aws-prepare.md) and [deployment](main-deployment/aws-deploy.md)
- [GitHub automation](main-deployment/github-actions.md) and [realtime](serverless-realtime.md)
