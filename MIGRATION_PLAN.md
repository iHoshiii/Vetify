# Main Vetify extraction and integration plan

Updated 14 October 2026. This plan documents the agreed boundaries and remaining
main work. Feature-code extraction is complete; cross-app authentication and deployment
remain separate work. Detailed feature requirements belong to their respective repositories.

## Repository ownership

| Repository            | Owns                                                                                 | Main relationship                                  |
| --------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `Vetify`              | Accounts, sessions, professional approval, appointments, communications, AI guidance | Central identity and main AWS deployment           |
| `vetify-meal-planner` | Meal planning and pet nutrition data                                                 | Native account APIs and versioned introspection    |
| `vetify-books`        | Document library, screening, affiliate records and files                             | Main user IDs and verified professional capability |
| `vetify-anatomy`      | Anatomy viewer and diagram assets                                                    | Main identity where access requires login          |
| `vetify-blogs`        | Articles, authoring and content moderation                                           | Main user IDs and current admin authority          |

Main domain is `vetify.page`. Proposed future hosts are `planner`, `books`,
`anatomy` and `blog` under that domain. Their DNS/hosting is not configured by
this plan. Each app deploys separately; hosting providers for feature apps are
not selected by this main-only AWS release.

## Shared accounts, independent data

Main alone stores users, passwords, provider identities, verification challenges,
account status, professional approval and central sessions/subscriptions.
Features reference immutable main user IDs. They never copy authentication
collections or receive main MongoDB credentials/JWT signing secrets.
Separate database namespaces require separate least-privilege credentials.
Separate databases on one cluster do not provide cluster-outage isolation.

Main's host-only browser refresh cookie remains local to main. Sharing accounts
does not require a broad parent-domain cookie or email-based account merging.
External web apps need a reviewed authorization-code/PKCE flow and app sessions.
Refresh tokens rotate under the existing implementation; account revocation and
concurrent-refresh behavior must remain intact.

## Current integration gaps

- Books/Anatomy code and assets are extracted; main retains protected launch pages.
- Books API, scanner, index creation, PDF worker and PDF.js dependency are removed.
- Planner feature UI, APIs and indexes are removed; `/planner` introduces the app.
- Main account export and admin statistics use only main data.
- Blog UI, APIs, moderation and index initialization are removed. Launch pages use `VITE_BLOGS_ORIGIN`.
- Professional Books/affiliate links now lead to external launch pages; unset
  destinations show an unavailable state.
- Planner exists as an Expo/native application with its own API. Its current
  docs require introspection version 2; main still returns version 1.
- Main introspection does not yet provide the complete approval/verification
  contract or subsystem audience checks needed by the target integration.
- Browser SSO for the independent feature sites is proposed, not implemented.

See [the shared authentication contract](docs/main-deployment/shared-auth.md)
for security requirements and [the extraction checklist](docs/main-deployment/extraction-checklist.md)
for exact import, indexing, packaging and navigation work.

## Work order

1. Preserve feature implementations in their own repositories and verify parity.
2. Remove their entry points, initialization and assets from main together.
3. Retain central browser/native auth, subscriptions, Planner handoff/QR,
   common date helpers and professional MediaPipe proof.
4. Make main launch links unavailable until their destinations are operational.
5. Test main in isolation, including account export and admin statistics.
6. Finish main private uploads and durable appointment jobs, then deploy main.
7. Coordinate main/Planner introspection version 2 and joint native tests.
8. Implement/test independent web SSO and verified-professional/admin capability.
9. Enable each external app only after its own deployment/integration checks.

Moving prompts or changing documentation does not remove runtime code.
No production account recreation or database deletion follows from extraction.
Data migration needs source inventory, backup, reviewed ownership mapping,
rehearsal and a rollback checkpoint. Email equality is not identity proof.

## Main release acceptance

No feature UI, API mount, collection initialization, PDF worker or Anatomy asset
remains in main release output. Main must work while all feature apps are down.
Accounts/verification/linking, professional approval, booking, reminders,
messages and calls preserve their behavior. Missing external destinations have
a clear unavailable state; API misses remain JSON, not frontend HTML.

Use [the main deployment guide](docs/main-deployment/README.md) for AWS steps.
