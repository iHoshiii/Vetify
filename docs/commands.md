# Main Vetify command reference

Run from the main repository with Node 24 and npm. On Windows use `npm.cmd` and
`npx.cmd` to avoid a blocked PowerShell script wrapper.
Configure local `.env` privately; production instructions are separate.

## Development

| Command                  | Purpose                                        |
| ------------------------ | ---------------------------------------------- |
| `npm.cmd ci`             | Install exact lockfile dependencies            |
| `npm.cmd run dev`        | Vite client and nodemon server                 |
| `npm.cmd run dev:client` | Client on localhost:5173                       |
| `npm.cmd run dev:server` | API on localhost:8000                          |
| `npm.cmd run preview`    | Preview a built client, not the production API |

`dev:server` explicitly uses `tsconfig.server.json` for server/shared aliases.
Vite proxies `/api` and local `/socket.io`.

## Build and validation

| Command                                                | Purpose                                         |
| ------------------------------------------------------ | ----------------------------------------------- |
| `npm.cmd run typecheck:client:runtime`                 | Client runtime type check                       |
| `npm.cmd run typecheck`                                | Full configured TypeScript projects             |
| `npm.cmd run lint`                                     | Repository ESLint checks                        |
| `npm.cmd run build:client`                             | Client output in dist/client                    |
| `npm.cmd run build:server`                             | Bundled persistent server in dist/server        |
| `npm.cmd run build`                                    | Client and persistent-server build              |
| `npm.cmd run start`                                    | Run persistent server, not Lambda               |
| `npm.cmd run build:lambda`                             | Lambda type check, bundles and runtime lockfile |
| `npm.cmd run test:lambda`                              | Isolated packaged Lambda smoke check            |
| `npm.cmd run build:client:prod -- --env-file=env.prod` | Isolated production frontend build              |

Current builds still include Planner/Blog. Books/Anatomy and PDF packaging are
removed. Verify the remaining extraction
gate before uploading them as main-only artifacts. Builds do not deploy AWS.
The broad server type check still includes obsolete auth files/tests with known
errors; the Lambda check covers its actual runtime import graph.

## Tests

| Command                     | Purpose                                    |
| --------------------------- | ------------------------------------------ |
| `npm.cmd run test`          | All Vitest tests                           |
| `npm.cmd run test:client`   | Client project tests                       |
| `npm.cmd run test:server`   | Server project tests                       |
| `npm.cmd run test:watch`    | Vitest watch mode                          |
| `npm.cmd run test:coverage` | Coverage run                               |
| `npm.cmd run test:e2e`      | Playwright with its configured build/setup |

Use isolated MongoDB fixtures. Do not run seeds or account resets against a
production database as part of verification. Earlier focused checks passed,
but the full suite has known failures; inspect results instead of assuming green.

## Database and deployment

The official MongoDB driver uses explicit model indexes; there is no Prisma
push/migration requirement. Schema changes do not automatically transform old
documents. Review and back up any needed data migration separately.
When an authorized development script needs server aliases, select the config:

```powershell
npx.cmd tsx --tsconfig tsconfig.server.json src/server/scripts/<script>.ts
```

See [AWS preparation](main-deployment/aws-prepare.md),
[deployment commands](main-deployment/aws-deploy.md) and
[release acceptance](main-deployment/aws-acceptance.md).
