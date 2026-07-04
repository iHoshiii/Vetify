# Vetify — Command Reference

Quick reference for all dev commands used in this project.

---

## 📦 General

| Command         | Description                                          |
| --------------- | ---------------------------------------------------- |
| `npm install`   | Install all dependencies                             |
| `npm run dev`   | Start the Next.js dev server (http://localhost:3000) |
| `npm run build` | Build the production bundle                          |
| `npm run start` | Start the production server                          |
| `npm run lint`  | Run ESLint across the project                        |

---

## 🗄️ Database (Prisma + Supabase)

| Command              | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| `npm run db:migrate` | Create and apply a new migration (prompts for a name)       |
| `npm run db:push`    | Push schema changes directly to DB without a migration file |
| `npm run db:seed`    | Run `prisma/seed.ts` to insert sample/demo data             |
| `npm run db:studio`  | Open Prisma Studio — visual UI to browse and edit DB tables |

### Raw Prisma CLI

| Command                     | Description                                               |
| --------------------------- | --------------------------------------------------------- |
| `npx prisma generate`       | Regenerate the Prisma Client after schema changes         |
| `npx prisma validate`       | Check `schema.prisma` for errors                          |
| `npx prisma migrate status` | Show which migrations have/haven't been applied           |
| `npx prisma migrate reset`  | ⚠️ Drop all tables and re-run all migrations from scratch |
| `npx prisma db pull`        | Introspect an existing DB and sync schema to match it     |

### Typical Prisma Workflow

```bash
# 1. Edit prisma/schema.prisma
# 2. Apply migration
npm run db:migrate   # enter a name like: add_appointments
# 3. Regenerate client
npx prisma generate
```

---

## 🧪 Testing

| Command                 | Description                            |
| ----------------------- | -------------------------------------- |
| `npm run test`          | Run all Vitest unit tests (single run) |
| `npm run test:watch`    | Run Vitest in watch mode               |
| `npm run test:coverage` | Run tests with code coverage report    |
| `npm run test:e2e`      | Run Playwright end-to-end tests        |

---

## 🐍 Backend (FastAPI — Python)

Run from `backend/core-api/`:

| Command                           | Description                                          |
| --------------------------------- | ---------------------------------------------------- |
| `python -m venv .venv`            | Create a Python virtual environment                  |
| `.venv\Scripts\activate`          | Activate the virtual environment (Windows)           |
| `pip install -r requirements.txt` | Install Python dependencies                          |
| `uvicorn app.main:app --reload`   | Start the FastAPI dev server (http://localhost:8000) |
| `pytest tests/ -v`                | Run backend tests                                    |

---

## 🐙 Git / CI

| Command                | Description                                 |
| ---------------------- | ------------------------------------------- |
| `git push origin main` | Push to main (CI is currently **disabled**) |

> **Re-enable CI:** Uncomment the `push` trigger in `.github/workflows/ci.yml`
