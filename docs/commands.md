# Command reference

Run from the repository root using Node 24. Commands use `npm.cmd` for Windows;
`npm` works on other supported shells. Keep local credentials in ignored files.

## Development

| Command                  | Purpose                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `npm.cmd ci`             | Install exact lockfile dependencies                              |
| `npm.cmd run dev`        | Start Vite and the persistent development API                    |
| `npm.cmd run dev:client` | Client on localhost:5173; copies required MediaPipe assets first |
| `npm.cmd run dev:server` | API on localhost:8000 with the server TypeScript configuration   |
| `npm.cmd run preview`    | Preview built client files; does not start the API               |

Create `.env` from [.env.example](../.env.example). Vite proxies `/api` and local
`/socket.io`. Bedrock development additionally needs an authenticated AWS profile;
see [Kupa setup](main-deployment/bedrock-chat.md).

## Types, lint, and tests

| Command                                | Purpose                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `npm.cmd run lint`                     | Repository ESLint checks                                                       |
| `npm.cmd run typecheck`                | Configured TypeScript projects                                                 |
| `npm.cmd run typecheck:client:runtime` | Client runtime import graph                                                    |
| `npm.cmd test`                         | Client and server Vitest projects; skips opt-in live AI tests                  |
| `npm.cmd run test:client`              | Client Vitest project                                                          |
| `npm.cmd run test:server`              | Server Vitest project                                                          |
| `npm.cmd run test:watch`               | Vitest watch mode                                                              |
| `npm.cmd run test:coverage`            | Vitest coverage report                                                         |
| `npm.cmd run test:e2e`                 | Build client and run configured Playwright browser tests                       |
| `npm.cmd run test:responsive`          | Typecheck, isolated production fixture build, and responsive Playwright tests  |
| `npm.cmd run test:chat:live`           | Opt-in real Bedrock classification and reply evaluation; incurs provider usage |

Node script checks run separately from Vitest:

```powershell
node --test scripts/__tests__/public-build-settings.test.mjs
node --test scripts/__tests__/env-loading.test.mjs scripts/__tests__/github-deployment.test.mjs scripts/__tests__/serverless-template.test.mjs
```

Install Playwright browsers before browser checks. Database tests use temporary
MongoDB fixtures. Never substitute a production database or run account seeds as
part of verification. Record actual failures and reruns in release evidence.

## Builds and packaged runtime

| Command                                                | Output or prerequisite                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `npm.cmd run build:client`                             | Standard Vite output in `dist/client`                                  |
| `npm.cmd run build:client:prod -- --env-file=env.prod` | Isolated public-setting build in `dist/client`                         |
| `npm.cmd run build:server`                             | Server typecheck and bundle in `dist/server`                           |
| `npm.cmd run build`                                    | Standard client and persistent server build                            |
| `npm.cmd start`                                        | Run built persistent server; not a Lambda entry point                  |
| `npm.cmd run test:production`                          | Smoke-test built server with temporary MongoDB                         |
| `npm.cmd run release:prod`                             | Build and assemble standalone release; defaults to `env.prod`          |
| `npm.cmd run test:release`                             | Install and smoke-test the assembled standalone runtime                |
| `npm.cmd run build:lambda`                             | Typecheck, build handlers, and generate `dist/lambda` runtime lockfile |
| `npm.cmd run test:lambda`                              | Install and smoke-test the packaged Lambda runtime                     |

`npm.cmd run build:prod` builds the production client and persistent server using
the default `env.prod`. Use the dedicated `build:client:prod` command when selecting an alternate env
file. Follow [configuration rules](main-deployment/configuration.md) and inspect
actual artifacts before publication. Builds do not deploy AWS.

## Administrative scripts

The official MongoDB driver creates explicit model indexes. There is no Prisma
push step. Index initialization does not transform existing documents.

Account seeds, role backfills, and data migrations change database records. Check
their target and arrange a backup before an authorized run. For direct server
scripts with aliases, explicitly select the server config:

```powershell
npx.cmd tsx --tsconfig tsconfig.server.json src/server/scripts/<script>.ts
```

Credential generators write private, ignored files and refuse overwrites:
`npm.cmd run auth:oidc:secrets` and `npm.cmd run auth:books:secrets`.
See [shared sign-in](main-deployment/anatomy-oidc.md) and
[Books capabilities](main-deployment/books-capabilities.md) before using them.

Use the [deployment guide](main-deployment/README.md) for cloud operations.
