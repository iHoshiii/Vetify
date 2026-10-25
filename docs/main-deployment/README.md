# Main deployment and integration guide

Reviewed 25 October 2026. This repository deploys main Vetify. The four feature
implementations are extracted into independent repositories. Main retains their
launch pages and approved identity interfaces.

## Ownership

| Application  | Repository            | Address or intended destination        | Owns                                                    |
| ------------ | --------------------- | -------------------------------------- | ------------------------------------------------------- |
| Main         | `Vetify`              | `https://vetify.page`                  | Accounts, approvals, appointments, communications, Kupa |
| Meal Planner | `vetify-meal-planner` | Public introduction at main `/planner` | Pets, plans, feeding, and nutrition data                |
| Books        | `vetify-books`        | `https://books.vetify.page`            | Documents, review, files, and commissions               |
| Anatomy      | `vetify-anatomy`      | `https://anatomy.vetify.page`          | Viewer, diagrams, and educational assets                |
| Blog         | `vetify-blogs`        | Proposed `https://blog.vetify.page`    | Articles, authoring, and moderation                     |

Addresses and configured launch links do not establish deployment health or
completed joint sign-in. Main's CI currently configures Books and Anatomy
origins; Blog is blank. Planner's public page uses local download/photo content
settings rather than a feature runtime bundle.

## Start here

1. Check [release ownership and packaging](extraction-checklist.md).
2. Read [configuration boundaries](configuration.md), including public settings,
   private credentials, and optional integration flags.
3. For existing infrastructure, use [GitHub Actions](github-actions.md).
   Successful pushes to `main` deploy automatically after CI passes.
4. For initial or administrator-managed changes, follow [AWS preparation](aws-prepare.md)
   and [deployment](aws-deploy.md). Do not duplicate stack-managed resources.
5. Run [live acceptance](aws-acceptance.md) against the deployed revision.
6. Enable external integrations only after their own joint acceptance.

The [cleanup audit](repository-cleanup-audit.md) records local validation and
remaining dependency migrations. A local build does not update the live site.

## Authentication interfaces

[Shared accounts](shared-auth.md) distinguishes three separate contracts:

- Main's native introspection remains version 1; Planner requires coordinated v2 work.
- Optional [OIDC sign-in](anatomy-oidc.md) supports Anatomy and Books with separate clients.
- [Books worker capabilities](books-capabilities.md) provide current approval
  checks using an independent expiring service credential.

Blog has no OIDC client registration. Shared account IDs do not imply shared
databases, main cookies, signing keys, or unrestricted cross-app access.

## Infrastructure and design

![Target ownership and hosting boundaries](architecture.svg)

The editable diagram describes component ownership. It is not a live resource
inventory. Main uses private S3/CloudFront, HTTP/WebSocket API Gateway, Lambda,
MongoDB, mail, Bedrock, and WebRTC/TURN. See [architecture](../architecture.md)
and [realtime](../serverless-realtime.md) for runtime details.

## Extraction records

- [Books and Anatomy](books-anatomy-extraction.md)
- [Meal Planner page](meal-planner-app-page.md)
- [Repository integration plan](../../MIGRATION_PLAN.md)

The dated extraction records preserve their original validation results.
Stored-data migration is separate and needs backups, ownership mapping, and a
rollback plan. No feature extraction authorizes deleting production data.
