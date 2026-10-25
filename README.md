# Vetify

Vetify connects pet owners with veterinary guidance and verified professionals.
This repository owns the main website, central accounts, professional onboarding,
clinic discovery, appointments, messaging, video-call signalling, and **Kupa**, the
AI veterinary assistant.

Meal Planner, Books, Anatomy, and Blog live in separate repositories. Main owns
their approved identity interfaces and launch pages. Each app owns its feature
data, assets, and deployment. See [repository boundaries](MIGRATION_PLAN.md).

## Develop locally

Use Node 24 and the committed npm lockfile. Create a private `.env` from
[.env.example](.env.example), then supply your development settings. On Windows,
use `npm.cmd` if PowerShell blocks the npm script wrapper.

```powershell
npm.cmd ci
npm.cmd run dev
```

The client runs at `http://localhost:5173`; the API runs at
`http://localhost:8000/api/v1`. Vite proxies `/api` and local Socket.IO traffic.
The server uses the official MongoDB driver. There is no Prisma setup step.

## Validate changes

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Ordinary tests mock AI provider calls and use isolated database fixtures. The
[command reference](docs/commands.md) covers browser, packaged-runtime, and live
Bedrock checks. Current cleanup evidence and remaining dependency advisories are
recorded in the [repository audit](docs/main-deployment/repository-cleanup-audit.md).

## Production configuration

Main's infrastructure templates use private S3/CloudFront, HTTP and WebSocket API
Gateway, and Lambda. Server credentials belong in AWS Secrets Manager. Build the
frontend using an ignored `env.prod` or the committed public CI settings:

```powershell
npm.cmd run build:client:prod -- --env-file=env.prod
```

The production builder exposes only six named public settings. Never put server
credentials in a `VITE_*` variable. API addresses and a dedicated browser basemap
key are intentionally visible. See [configuration boundaries](docs/main-deployment/configuration.md).

Pushes to `main` run CI and automatically deploy after validation succeeds.
Feature branches do not run those workflows. Local builds and commits do not
update the live site. Review [GitHub deployment](docs/main-deployment/github-actions.md)
before merging a release.

## Documentation

- [Documentation index](docs/README.md)
- [Product requirements](docs/PRD.md), [technical design](docs/TDD.md), and [architecture](docs/architecture.md)
- [User flows](docs/flowchart.md) and [delivery plan](docs/masterplan.md)
- [Kupa behavior and Bedrock setup](docs/main-deployment/bedrock-chat.md)
- [Shared authentication](docs/main-deployment/shared-auth.md)
- [AWS deployment and acceptance](docs/main-deployment/README.md)

Deployment acceptance still covers real inbox delivery, external app sign-in,
cross-network calls, monitoring, and production configuration. Passing local
tests does not establish the state of deployed services.
