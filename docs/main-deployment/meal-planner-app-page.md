# Meal Planner app page and extraction

Main `/planner` is a public introduction to the separate Meal Planner mobile app.
It no longer loads a meal planner or requires sign-in just to view this page.

## Page order and future assets

1. Public app download QR placeholder and download link placeholder.
2. Six app highlight photo slots, three per row on desktop and two on smaller screens.
3. Account guidance, signup link and Settings account-connection link.

Update `src/client/pages/planner/planner-content.ts` when the assets are supplied:

- `plannerDownload.qrImageSrc`: public QR image path.
- `plannerDownload.url`: actual app download address.
- Each `plannerHighlights[].imageSrc`: one of the six photo paths, in display order.
- Each highlight's title and description: final photo captions.

Public assets can live in `public/meal-planner/`, for example
`public/meal-planner/download-qr.png` referenced as `/meal-planner/download-qr.png`.
Leave values `null` until the assets/address exist. The download button stays
disabled while its URL is missing. Photo failures fall back to the placeholder.

The QR on this page must encode the public download destination. Never put a
private account connection QR or a temporary sign-in credential into public assets.
Personal connection QR codes remain under Settings → Connect meal planner.

## What was removed

Main no longer contains the embedded pet/meal UI, Planner client services, shared
pet/meal/nutrition modules, feature models or data route implementations. The
`/api/v1/pets`, `/meal-plans` and `/nutrition-observations` mounts are removed.
Startup does not initialize their collections/indexes. Main account export now
contains main account details and preferences, without Planner pets.

The separate `../vetify-meal-planner` repository retains its native app and API.
Original main files are also preserved in Git history. No stored database data
was migrated or deleted, and no actual `.env` file was read or changed.

## What remains central

Main owns users, verification, login methods, subscriptions, native sessions,
introspection and account handoff. Settings' Connect meal planner and its QR stay.
`src/server/planner-dev.ts` and `src/server/scripts/seed-planner-account.ts` remain
because the sibling app invokes them for main authentication during development.

Users should use their existing Vetify account and their usual linked login
method. Sharing an email alone does not link a new social provider. The public
page describes this account model; it does not establish production integration.
Main currently provides introspection version 1 while the sibling requires version 2.
Coordinate and jointly test that contract before enabling the production download.

Blog has also been extracted. Deployment still requires the main release acceptance checks.

## Validation

- 32 targeted client tests and 75 targeted server tests passed across the final runs.
- Client runtime typecheck, production frontend build and Lambda build passed.
- Packaged Lambda smoke passed, including removed API/index assertions.
- Chromium verified public access, six photo slots and section order at 1280,
  768 and 390 pixels. Desktop uses three columns; smaller widths use two.
- Desktop and phone previews have no horizontal overflow or page runtime errors.
  The existing global navigation overflows at 768 pixels; the new main content fits.
- Changed source files passed ESLint. The full repository suite was not rerun.
