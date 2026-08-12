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

## Database (Mongoose + MongoDB Atlas)

Vetify uses **Mongoose** for schema definition and MongoDB Atlas as the database. There are no migration CLI commands — schema changes are made directly in the model files under `src/server/models/`.

### How it works

| Concept        | How it's done in Mongoose                                         |
| -------------- | ----------------------------------------------------------------- |
| Define schema  | Edit a model file in `src/server/models/`                         |
| Apply changes  | Just save and restart the server — no push/migrate needed         |
| Add a field    | Add it to the Mongoose schema; existing docs won't have it (null) |
| Remove a field | Remove from schema; existing docs retain the field in MongoDB     |
| Rename a field | Manual: write a script to update existing documents               |
| Seed data      | Write a script in `src/server/scripts/` and run with `tsx`        |
| Inspect data   | Use MongoDB Atlas UI or MongoDB Compass                           |

### Useful one-off commands

```bash
# Run a seed or migration script manually
npx tsx src/server/scripts/<script>.ts

# Connect to your Atlas cluster via mongosh
mongosh "<MONGODB_URI>"
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
