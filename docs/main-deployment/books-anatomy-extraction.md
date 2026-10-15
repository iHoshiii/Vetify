# Books and Anatomy removed from main

Completed locally on 14 October 2026. This record covers source extraction,
not AWS/Vercel deployment, central SSO completion or database migration.

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

Main's existing account/role guards remain in front of these pages.
Configure `VITE_BOOKS_ORIGIN` and `VITE_ANATOMY_ORIGIN` when the separate apps
are ready. Blank or invalid destinations show a clear unavailable state.
Production requires clean HTTPS origins; local loopback HTTP is allowed for dev.
No credentials, identity records or access tokens are appended to launch URLs.
The isolated production builder reads these public values explicitly.

Example local destinations are `http://localhost:5175` for Books and
`http://localhost:5176` for Anatomy. Proposed production hosts are
`https://books.vetify.page` and `https://anatomy.vetify.page`.
These addresses are not proof that the applications are deployed or sign-in works.
Leave the settings blank until their integrations are validated.

## Validation

- Fresh separate-repository tests: Books 69 passed, Anatomy 27 passed.
- Main regression: 181 passed across 12 targeted suites, including auth, native
  sessions, professional approvals, appointments, route gates and launch pages.
- Nine Node checks passed for environment isolation, template and release scripts.
- Client runtime type check, isolated production frontend build and Lambda build passed.
- Packaged Lambda smoke checked signup, realtime tickets/delivery/cleanup,
  Books API 404 and absence of Books collections on startup.

The full repository test suite was not declared green. `build:server` still
encounters pre-existing obsolete email-verification files/tests included by its
broad TypeScript configuration. Those files were not changed during extraction.
The reachable Lambda runtime graph typechecks separately and builds successfully.

## Remaining work

Blog remains embedded. Planner feature code was subsequently removed and replaced
by [a public app page](meal-planner-app-page.md). This is not yet a complete main-only release.
Main shared browser authentication/OIDC and Books professional capabilities are
still missing, so independent apps cannot yet reuse real accounts completely.
Stored library documents were not moved or deleted. Review any feature-only data
migration with backups and immutable main user IDs separately.
Continue [the remaining extraction checklist](extraction-checklist.md) and
[central authentication work](shared-auth.md) before enabling launch destinations.
