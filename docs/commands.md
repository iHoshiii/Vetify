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

## Database (mongodb driver + MongoDB Atlas)

Vetify talks to MongoDB Atlas through the official `mongodb` driver — there is no ODM. Each file under `src/server/models/` exports a typed collection accessor, a Zod schema for the attributes it accepts, and the indexes that collection needs. There are no migration CLI commands.

### How it works

| Concept        | How it's done with the driver                                                     |
| -------------- | --------------------------------------------------------------------------------- |
| Define a shape | Edit the document type and Zod schema in `src/server/models/`                     |
| Apply changes  | Just save and restart the server — nothing is pushed to Mongo                     |
| Add a field    | Add it to the document type and Zod schema; existing docs won't have it (null)    |
| Remove a field | Remove it from both; existing docs retain the field in MongoDB                    |
| Rename a field | Manual: write a script to update existing documents                               |
| Add an index   | Add it to that model's `*_INDEXES` array — `ensureIndexes()` creates it at boot   |
| Validation     | Zod, at the model boundary; a bad write raises `ZodError`, which the handler 400s |
| Seed data      | Write a script in `src/server/scripts/` and run with `tsx`                        |
| Inspect data   | Use MongoDB Atlas UI or MongoDB Compass                                           |

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
