# Main Vetify documentation

Current scope: main website and central account authority only.
Updated 14 October 2026. Selected hosting is S3/CloudFront with API Gateway/Lambda.
Feature descriptions and setup prompts are maintained in their own repositories.

## Product and engineering

| Document                                | Purpose                                                   |
| --------------------------------------- | --------------------------------------------------------- |
| [PRD](PRD.md)                           | Main requirements, actors, permissions and acceptance     |
| [TDD](TDD.md)                           | Current implementation, target release and technical gaps |
| [Architecture](architecture.md)         | Main components, ownership and external interfaces        |
| [Flows](flowchart.md)                   | Main account, booking, communications and launch flows    |
| [Business scope](business-idea.md)      | Main customers, value and operational assumptions         |
| [Delivery plan](masterplan.md)          | Remaining work and release gates                          |
| [Commands](commands.md)                 | Actual package scripts for development and checks         |
| [Extraction plan](../MIGRATION_PLAN.md) | Main boundaries and coordinated integration work          |

## Deployment and authentication

- [Main deployment index and picture](main-deployment/README.md)
- [Main extraction checklist](main-deployment/extraction-checklist.md)
- [Completed Books/Anatomy extraction](main-deployment/books-anatomy-extraction.md)
- [Meal Planner app page and extraction](main-deployment/meal-planner-app-page.md)
- [Central authentication contract](main-deployment/shared-auth.md)
- [AWS preparation](main-deployment/aws-prepare.md)
- [AWS deployment](main-deployment/aws-deploy.md)
- [Live acceptance](main-deployment/aws-acceptance.md)
- [Implemented WebSocket design](serverless-realtime.md)

The diagram shows target ownership. The current main build still includes Blog
feature code. Planner/main auth contract versions differ, and external web SSO is pending.
None of these documents establishes a deployed production service.

## Historical owner records

[vetify_PRD.docx](vetify_PRD.docx) and [vetify_TDD.docx](vetify_TDD.docx) are the
owner-authored original Word records. They contain older whole-product scope and
technology assumptions and are retained for provenance. The Markdown documents
above define the current main scope and take precedence for implementation.

## Separate repository locations

Sibling folders are `vetify-meal-planner`, `vetify-books`, `vetify-anatomy`
and `vetify-blogs`. Each maintains `docs/DESCRIPTION.md` for its own feature.
Main keeps their identity/capability interfaces, availability behavior and data
ownership references; their detailed product designs do not belong here.
