# Books and Anatomy removed from main

Completed locally on 14 October 2026. This record covers source extraction,
not AWS/Vercel deployment, central SSO completion or database migration.

Integration notes reviewed 25 October 2026. The validation counts below are
historical results from the extraction, not a current full-suite report.

## Changes

- Removed Books library/upload/affiliate UI and feature tests from main.
- Removed Books API/model, screening service, review scanner and PDF worker.
- Removed Books/download-quota index initialization without dropping stored data.
- Removed PDF.js from main dependencies and all main runtime packages.
- Removed Anatomy viewer/types/data and fifteen illustration assets from main.
- Retained main auth, appointment booking, professionals, MediaPipe proof,
  realtime, common UI helpers and admin chart dependencies.
- Kept separate implementations in `vetify-books` and `vetify-anatomy`.
  All fifteen migrated Anatomy pictures matched the originals by SHA-256.
- Preserved forty-two original feature files in an ignored local backup and Git
  history before removing their main copies.

Main model exports/index maintenance were split into bounded files to preserve
the existing API and index-conflict behavior while removing Books initialization.

## Main entry pages

Existing navigation URLs remain useful:

| Main route                           | Independent destination   |
| ------------------------------------ | ------------------------- |
| `/books`                             | Books origin `/`          |
| `/anatomy`                           | Anatomy origin `/`        |
| `/professionals/dashboard/books`     | Books origin `/manage`    |
| `/professionals/dashboard/affiliate` | Books origin `/affiliate` |

Current launch behavior differs from the original extraction: `/books` redirects
to the configured Books origin without a main login gate. Professional management
and affiliate links retain console role checks. Anatomy validates the main
session before opening its independent app and supports a hosted viewer bridge.

Configure `VITE_BOOKS_ORIGIN` and `VITE_ANATOMY_ORIGIN` for the intended apps.
Blank Books configuration shows unavailable. Blank Anatomy configuration uses
`https://anatomy.vetify.page` in production or localhost:5176 in development.
Production requires clean HTTPS origins; local loopback HTTP is allowed for dev.
No credentials, identity records or access tokens are appended to launch URLs.
The isolated production builder reads these public values explicitly.

Example local destinations are `http://localhost:5175` for Books and
`http://localhost:5176` for Anatomy. Proposed production hosts are
`https://books.vetify.page` and `https://anatomy.vetify.page`.
These addresses are not proof that the applications are deployed or sign-in works.
Validate configured destinations and joint sign-in before relying on them.

## Validation

- Fresh separate-repository tests: Books 69 passed, Anatomy 27 passed.
- Main regression: 181 passed across 12 targeted suites, including auth, native
  sessions, professional approvals, appointments, route gates and launch pages.
- Nine Node checks passed for environment isolation, template and release scripts.
- Client runtime type check, isolated production frontend build and Lambda build passed.
- Packaged Lambda smoke checked signup, realtime tickets/delivery/cleanup,
  Books API 404 and absence of Books collections on startup.

At extraction time, the full repository suite was not declared green and broad
server checking still encountered obsolete email-verification files/tests.
The later cleanup removed obsolete modules and retargeted resend tests to the
current API. Full types and server build now pass. See the
[cleanup audit](repository-cleanup-audit.md) for current validation.

## Remaining work

Blog was subsequently extracted into its own repository. Planner feature code was removed and replaced
by [a public app page](meal-planner-app-page.md). Actual release artifacts still
need acceptance checks. Optional Anatomy/Books OIDC and Books professional
capabilities are now implemented. Configuration and joint deployed acceptance
remain necessary before relying on these integrations.
Stored library documents were not moved or deleted. Review any feature-only data
migration with backups and immutable main user IDs separately.
Continue [the remaining extraction checklist](extraction-checklist.md) and
[central authentication work](shared-auth.md) before enabling launch destinations.
