# Extract features before building a main-only release

This checklist is planned work. No implementation or stored data was removed.

## 1. Preserve the implementations

Keep a Git checkpoint and create four local repositories. Attach the corresponding
prompt and grant the coding agent read access to the existing Vetify source.
Copy actual feature code/assets and useful tests. Do not replace working behavior
with code invented from a prompt. Do not copy `.env`, credentials, users,
professional approvals or production databases.

PowerShell, after replacing the parent directory if desired:

```powershell
Set-Location C:\Users\Administrator\OneDrive\Desktop
New-Item -ItemType Directory vetify-meal-planner,vetify-books,vetify-anatomy,vetify-blog
git -C vetify-meal-planner init
git -C vetify-books init
git -C vetify-anatomy init
git -C vetify-blog init
```

Open each folder as its own workspace and paste its `PROMPT.md` into the agent.
The prompt supplies source paths. Do not run scaffold commands in the main folder.

## 2. Assign ownership

| Feature | Existing source roots                                                                                                                         | Main integration that must change                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Planner | `src/client/pages/planner/`, `src/shared/meal-*.ts`, pet/nutrition schemas; `/pets`, `/meal-plans`, `/nutrition-observations` APIs and models | Eager Planner import, account pet export, indexes, dev/seed scripts    |
| Books   | `src/client/pages/books/`, `src/shared/books.ts`, Books API/model, screening/review/PDF services                                              | Professional Books and affiliate pages, worker build, scanner, indexes |
| Anatomy | `src/client/pages/anatomy/`, `src/client/types/anatomy.ts`, `public/anatomy/`                                                                 | Frontend route and asset copying                                       |
| Blog    | `src/client/pages/blogs/`, Blog service/model, public/admin APIs and admin editor                                                             | Admin posts navigation, dashboard counts/charts, indexes               |

The feature prompts contain more detailed maps. Shared files contain mixed
features: extract the needed definitions instead of deleting the whole file.

## 3. Keep these in main

- Users, auth identities, signup/email codes, login-method linking, recovery,
  browser and native sessions, native handoff, introspection and subscriptions.
- Settings' Connect Meal Planner QR remains central account infrastructure.
  The existing native client registration is not a generic client for all apps.
- Professional inquiries/approval/profiles, clinic directory/map, appointments,
  messages, notifications, moderation of main accounts, audits and realtime.
- AI Vet Assistant and its required Gemini/moderation code.
- Professional selfie/identity proof: it still uses MediaPipe.
  Anatomy is not a reason to remove `@mediapipe/tasks-vision` or its assets.
- Main branding, home/help/about/legal/contact pages and shared layout.

## 4. Cut all main entry points together

1. Replace feature routes in `src/client/App.tsx` with a small launch/unavailable
   page. Remove direct and lazy imports of all four feature implementations.
2. Update `src/client/routes/console-routes.tsx`: Books management, professional
   affiliate and admin Blog management belong to their own apps. Keep useful
   links, protected by role where appropriate, to configured destinations.
3. Check navigation, home cards, footer, services and settings for old internal
   links. Preserve discoverability without importing the feature bundles.
4. Remove feature API mounts/imports from `src/server/routes/v1/index.ts` and
   Blog moderation mounts from `src/server/routes/v1/admin/index.ts`.
5. Split indexing in `src/server/models/index.ts`. Main startup/Lambda must not
   create Books, Blog, pet, meal, feeding or nutrition collections/indexes.
   Keep auth/native/subscription/professional/appointment/realtime indexes.
   Preserve a common calendar/time-zone helper: main `account-today.ts` currently
   imports `@shared/planner-date` despite that helper's feature-specific name.
6. Remove the Books scanner import/start/stop in `src/server/index.ts`.
   Move its durable review scheduling to the Books repository.
7. Remove the PDF worker entry from `scripts/build-lambda.mjs` and
   `scripts/build-server.mjs`. Update Lambda packaging/smoke/template checks.
8. Main `src/server/services/metrics.service.ts` currently reads Blog counts.
   Remove those metrics with matching schema/chart changes, or consume an
   explicit optional Blog aggregate API. Do not query Blog's database directly.
9. Main `src/server/routes/v1/account.route.ts` exports pets. Replace this with
   coordinated export across apps, or clearly scope the export to main data.
10. Inventory feature-only libraries with a dependency graph. Remove only those
    no main component needs. Vite copies `public/` even if no route imports it,
    so move Anatomy assets out before building main.
11. Remove obsolete feature tests/scripts from main only after equivalent tests
    and scripts exist in their new repositories. Keep shared auth tests in main.

## 5. Move stored data separately

Inventory collections read-only on each actual server first. A database named
`vetify` on another cluster is still a different database. Do not guess ownership
from its name or drop collections because an earlier URI was incorrect.

Back up selected feature collections, validate owners against main IDs and
reconcile any duplicates created on the wrong server. Preserve main user IDs.
Use an explicit migration plan with counts/checksums and a rollback checkpoint.
For Books, move PDF bytes to that service's private object storage and persist
object keys. Migrations require the actual source/destination names and review.
This document does not authorize deleting live data.

## 6. Release acceptance

- Main frontend dependency graph has none of the four feature implementations.
  Its assets contain no Anatomy payload; MediaPipe remains where main needs it.
- Main API feature endpoints are absent. An API miss returns JSON 404, not SPA HTML.
- Main Lambda contains HTTP/WebSocket/maintenance and required main workers only,
  with no PDF worker or feature-only packages. Inspect its generated package.
- Starting main on an empty isolated Mongo database does not create feature
  collections. Exercise representative routes so lazy access is covered too.
- Home/nav/account export/admin metrics render without feature services running.
- Main signup/login/verification/linking, professional approval, appointments,
  reminders, messaging and calls pass regression tests.
- Test redirect destinations and unavailable feature states on desktop/mobile.
- All four repositories can build independently and have safe sample env files.
- Cross-app sign-in is tested against the shared-auth contract before enabling it.

Only after this gate passes should `dist/client` and `dist/lambda` be called
main-only deployment artifacts. The current builders do not implement this gate.
