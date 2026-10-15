# Deploy main Vetify, extract four separate applications

This is an inspected deployment plan, not a completed extraction or AWS deployment.
The working source is preserved. The current builds still include subsystem code.
Do not upload them as a main-only release until the extraction checks pass.

## Scope agreed with the owner

| Application  | Suggested repository       | Suggested address             | Data owner                                                        |
| ------------ | -------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| Main Vetify  | Existing Vetify repository | `https://vetify.page`         | Accounts, professional approvals, appointments, messages          |
| Meal Planner | `vetify-meal-planner`      | `https://planner.vetify.page` | Pets, plans, feeding logs, nutrition observations                 |
| Books        | `vetify-books`             | `https://books.vetify.page`   | Documents, reviews, download allowances, commissions              |
| Anatomy      | `vetify-anatomy`           | `https://anatomy.vetify.page` | Static diagrams and hotspot content; no database needed initially |
| Blog         | `vetify-blog`              | `https://blog.vetify.page`    | Posts, moderation decisions and content audit history             |

The four subdomain names are proposals. No DNS records or resources were created.
AI Vet Assistant remains in main Vetify. Books means the document library, not
appointment booking. Appointments, chat between users, calls, the clinic map,
professional onboarding, settings and account administration remain in main.

## Picture

![Proposed main-only deployment and independent feature applications](architecture.png)

Editable version: [architecture.svg](architecture.svg).
Boxes below the main deployment boundary are future, independently deployed apps.
Only accounts are shared through main authentication APIs. Databases are not shared.

## Start here

1. Read [the extraction checklist](extraction-checklist.md). It identifies the
   dependencies that make immediate deletion unsafe.
2. Create each feature repository locally and run its prompt with access to the
   existing source. A prompt alone cannot recover deleted implementation or data.
3. Implement and test [the central authentication contract](shared-auth.md).
4. Preserve and validate each extracted feature before removing its main roots.
5. Verify the main-only release, then follow [AWS preparation](aws-prepare.md)
   and [AWS deployment](aws-deploy.md).
6. Deploy only main now. A feature link without a deployed destination should
   show an unavailable state, rather than open an unconfigured website.

## Prompts to paste into each repository

- [Meal Planner](../subsystems/meal-planner/PROMPT.md)
- [Books](../subsystems/books/PROMPT.md)
- [Anatomy](../subsystems/anatomy/PROMPT.md)
- [Blog](../subsystems/blog/PROMPT.md)

Each prompt names the source to port, what must stay in main, separate environment
settings, authorization requirements and acceptance checks.

## What was checked

The plan was checked against the existing frontend routes, API mounts, shared
schemas, model indexing, Lambda build, authentication introspection, Books
approval checks, Anatomy rendering and local background scanners.
Main currently imports all four frontends. Its API mounts Planner, Books and
Blog routes. Its Lambda package explicitly builds a Books PDF worker.
These are concrete extraction tasks, not settings you can solve by changing a URI.

Existing realtime validation does not prove that this proposed extraction works.
The new shared web sign-in flow and main-only package must receive their own
tests before deployment. No environment file, account, database or AWS resource
was changed while preparing this plan.
