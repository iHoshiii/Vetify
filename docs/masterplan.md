# Main Vetify delivery plan

Updated 14 October 2026. Scope is main only. This plan separates implemented
foundations from remaining release work; no phase implies a live AWS deployment.

## Current status

| Area                                             | Status                                           |
| ------------------------------------------------ | ------------------------------------------------ |
| Main React/Express/Mongo foundations             | Implemented                                      |
| Browser/native accounts, email codes and linking | Implemented; release regression required         |
| Professional/clinic/appointment workflows        | Implemented; serverless upload/jobs work pending |
| Main AI assistant                                | Implemented; policy/provider checks required     |
| Local Socket.IO and Gateway WebSocket adapters   | Implemented; live cloud acceptance pending       |
| Main-only feature extraction                     | Planner/Books/Anatomy/Blog removed               |
| Planner introspection v2 compatibility           | Pending coordinated main/Planner work            |
| Separate-app browser SSO                         | Planned, not implemented                         |
| AWS production release                           | Pending                                          |

## Phase 1: establish main ownership

Preserve each feature implementation in its own repository. Descriptions/prompts
now belong there. Remove feature import roots, API mounts, collection/index
initialization, PDF packaging and Anatomy assets from main together.
Update account exports, admin metrics and professional/navigation links.
Retain central native auth, Planner QR/handoff, subscription authority, common
region/date helpers and professional MediaPipe capture.
Gate: main starts, renders and functions with all feature apps unavailable.

## Phase 2: finish main serverless requirements

Implement private professional image uploads through authorized object storage.
Schedule reminders, completion and mail retries durably with idempotency and
bounded retry/error visibility. Review clinic refresh scheduling.
Verify persistent abuse controls, configuration, DB/network access and secrets.
Gate: main workflows work without persistent Node intervals or open browsers.

## Phase 3: validate main release

Run auth/verification/linking, professional approval, booking, messaging and call
regression tests. Verify package contents exclude feature implementation/data.
Check admin metrics and exports without external dependencies.
Earlier focused checks passed; full-suite failures remain and need assessment.
Gate: relevant failures resolved and the actual release artifacts verified.

## Phase 4: deploy main AWS resources

Review credits/budget and credentials. Configure DNS, certificate, production
mail and main database network access. Deploy the SAM backend, private frontend
S3 and CloudFront; use isolated frontend build settings and production secrets.
Test real inbox delivery, provider callbacks, durable jobs and cross-network TURN.
Gate: [live acceptance](main-deployment/aws-acceptance.md) passes with monitoring.

## Phase 5: enable external integrations separately

Coordinate Planner's native version 2 introspection contract with main.
Implement registered-client web sign-in and trusted professional/admin capability.
Test account reuse, revocation, disabled users and provider-link collisions.
Each feature deploys independently; enable its main link only after it works.
Main launch can precede this phase with external links marked unavailable.

## Execution references

- [Main extraction plan](../MIGRATION_PLAN.md)
- [Exact extraction checklist](main-deployment/extraction-checklist.md)
- [Central authentication contract](main-deployment/shared-auth.md)
- [AWS preparation](main-deployment/aws-prepare.md)
- [AWS deployment](main-deployment/aws-deploy.md)
- [Implemented realtime](serverless-realtime.md)
