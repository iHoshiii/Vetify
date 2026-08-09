# Vetify — Command Reference

## General

| Command              | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `npm install`        | Install all dependencies                             |
| `npm run dev`        | Start client (Vite) + server (Express) concurrently  |
| `npm run dev:client` | Start Vite dev server only (http://localhost:5173)   |
| `npm run dev:server` | Start Express + nodemon only (http://localhost:3000) |
| `npm run build`      | Build client and server                              |
| `npm run start`      | Run the built server (`dist/server/index.js`)        |
| `npm run preview`    | Preview the Vite production build                    |

## Linting & Types

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `npm run lint`      | Run ESLint across `.ts` and `.tsx` files |
| `npm run lint:fix`  | Run ESLint with auto-fix                 |
| `npm run typecheck` | Run TypeScript type check (`tsc -b`)     |

## Database (Prisma + MongoDB Atlas)

> MongoDB uses `db push` — there is no `migrate dev`.

| Command               | Description                                   |
| --------------------- | --------------------------------------------- |
| `npx prisma db push`  | Apply schema changes to MongoDB Atlas         |
| `npx prisma generate` | Regenerate Prisma client after schema changes |
| `npx prisma validate` | Check `schema.prisma` for errors              |
| `npx prisma db pull`  | Introspect existing DB and sync schema        |
| `npx prisma studio`   | Open Prisma Studio — visual DB browser        |

### Typical workflow

```bash
# 1. Edit prisma/schema.prisma
# 2. Push changes
npx prisma db push
# 3. Regenerate client
npx prisma generate
```

## Testing

| Command                 | Description                            |
| ----------------------- | -------------------------------------- |
| `npm run test`          | Run all Vitest unit tests (single run) |
| `npm run test:watch`    | Run Vitest in watch mode               |
| `npm run test:client`   | Client tests only                      |
| `npm run test:server`   | Server tests only                      |
| `npm run test:coverage` | Run tests with coverage report         |
| `npm run test:e2e`      | Run Playwright E2E tests               |

## Git / CI

| Command                    | Description                         |
| -------------------------- | ----------------------------------- |
| `git push origin <branch>` | Push branch (CI currently disabled) |

> Re-enable CI: remove `branches-ignore: ['**']` from `.github/workflows/ci.yml`
