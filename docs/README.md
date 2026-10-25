# Vetify documentation

Reviewed against this repository on **25 October 2026**. These Markdown documents
describe main Vetify and the interfaces it owns. Detailed feature designs belong
to their separate repositories.

## Product and engineering

| Document                                 | Purpose                                                  |
| ---------------------------------------- | -------------------------------------------------------- |
| [PRD](PRD.md)                            | Product scope, actors, permissions, and acceptance       |
| [Technical design](TDD.md)               | Implemented stack, authentication, storage, jobs, and AI |
| [Architecture](architecture.md)          | Runtime components and ownership                         |
| [Flows](flowchart.md)                    | Accounts, consultations, Kupa, and external launches     |
| [Business scope](business-idea.md)       | Customers, operating assumptions, and measures           |
| [Delivery plan](masterplan.md)           | Implemented foundations and remaining release gates      |
| [Commands](commands.md)                  | Package scripts and their prerequisites                  |
| [Integration plan](../MIGRATION_PLAN.md) | Repository boundaries and coordinated work               |

## Configuration and operations

| Document                                                                | Purpose                                                       |
| ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| [Deployment index](main-deployment/README.md)                           | Release order and infrastructure ownership                    |
| [Configuration](main-deployment/configuration.md)                       | Public settings, server secrets, and rotation                 |
| [Repository cleanup audit](main-deployment/repository-cleanup-audit.md) | Findings, safe fixes, validation, and deferred major upgrades |
| [AWS preparation](main-deployment/aws-prepare.md)                       | Credentials, domain, mail, database, and secrets              |
| [AWS deployment](main-deployment/aws-deploy.md)                         | Backend/frontend deployment commands                          |
| [GitHub Actions](main-deployment/github-actions.md)                     | Automatic deployment, credentials, and rollback               |
| [Live acceptance](main-deployment/aws-acceptance.md)                    | Checks against the deployed application                       |
| [Realtime](serverless-realtime.md)                                      | Socket.IO, Gateway WebSockets, and WebRTC                     |
| [Kupa and Bedrock](main-deployment/bedrock-chat.md)                     | Semantic scope policy, provider behavior, and live evaluation |

## External integrations

- [Shared account contracts](main-deployment/shared-auth.md)
- [Anatomy and optional Books OIDC setup](main-deployment/anatomy-oidc.md)
- [Books worker capabilities](main-deployment/books-capabilities.md)
- [Extraction checklist](main-deployment/extraction-checklist.md)
- [Books/Anatomy extraction record](main-deployment/books-anatomy-extraction.md)
- [Meal Planner page and extraction record](main-deployment/meal-planner-app-page.md)

The sibling folders are `vetify-meal-planner`, `vetify-books`, `vetify-anatomy`,
and `vetify-blogs`. Their `docs/DESCRIPTION.md` files describe their own features.
Main's native introspection remains version 1. The shared OIDC provider and Books
worker capability endpoint are separate protocols; neither upgrades Planner's
contract automatically.

## Historical records and evidence

[Original PRD](vetify_PRD.docx) and [original TDD](vetify_TDD.docx) are preserved
owner-authored Word records. They contain older whole-product assumptions. The
maintained Markdown documents define current implementation scope.

Dated extraction results describe the checks run at that time. The cleanup audit
records this pass's results. Neither historical tests nor architecture diagrams
establish current production health; use live acceptance for that assessment.
