vetify/ # Workspace root
|
|-- .github/
| `-- workflows/
|       |-- production-deploy.yml     # Production deployment workflow
|       `-- test-pipeline.yml # CI test pipeline
|
|-- .husky/
| |-- \_/
| | |-- .gitignore
| | `-- husky.sh
|   `-- pre-commit # Local pre-commit hook
|
|-- archive/ # Historical backups and retired app files
| |-- apps-web/
| | |-- next-env.d.ts
| | `-- tsconfig.json
|   |-- backend_backup/
|   |   `-- .placeholder
| |-- backend_backup_2026-06-18.zip
| `-- backup-2026-06-18-src_backup.zip
|
|-- backend/
|   `-- core-api/ # FastAPI backend service
| |-- app/
| | |-- **init**.py
| | |-- main.py # API application entry point
| | |-- core/
| | | |-- **init**.py
| | | |-- config.py # Backend configuration
| | | `-- security.py        # Security helpers
|       |   |-- domains/
|       |   |   |-- __init__.py
|       |   |   |-- locator/
|       |   |   |   |-- __init__.py
|       |   |   |   |-- router.py
|       |   |   |   `-- services.py
| | | |-- nutrition/
| | | | |-- **init**.py
| | | | |-- router.py
| | | | `-- services.py
|       |   |   `-- triage/
| | | |-- **init**.py
| | | |-- router.py
| | | |-- schemas.py
| | | `-- services.py
|       |   `-- infra/
| | |-- **init**.py
| | |-- ai_clients.py
| | |-- database.py
| | `-- langchain_client.py
|       |-- apps/
|       |   `-- web/
| | `-- package-lock.json
|       |-- scripts/
|       |   |-- run_migration.py
|       |   `-- migrations/
| | |-- **init**.py
| | `-- 2026_06_18_init_pet_avatar_defaults.py
|       |-- tests/
|       |   |-- __init__.py
|       |   |-- conftest.py
|       |   |-- test_locator.py
|       |   |-- test_nutrition.py
|       |   `-- test_triage.py
| |-- .env.example
| |-- .gitignore
| |-- Dockerfile
| `-- requirements.txt
|
|-- docs/
|   |-- PRD.md
|   |-- TDD.md
|   |-- architecture.md
|   |-- flowchart.md
|   |-- landing-page-design.md
|   `-- masterplan.md
|
|-- prisma/
| |-- schema.prisma # Prisma schema
| `-- seed.ts                       # Database seed script
|
|-- public/
|   `-- favicon.ico
|
|-- src/ # Next.js frontend app
| |-- **tests**/
| | |-- ChatWindow.test.tsx
| | |-- MealCalendar.test.tsx
| | `-- setup.ts
|   |-- app/
|   |   |-- chat/
|   |   |   `-- page.tsx
| | |-- map/
| | | `-- page.tsx
|   |   |-- planner/
|   |   |   `-- page.tsx
| | |-- globals.css
| | |-- layout.tsx
| | `-- page.tsx
|   |-- components/
|   |   |-- ui/
|   |   |   |-- Button.tsx
|   |   |   `-- Input.tsx
| | |-- ChatWindow.tsx
| | `-- MapClient.tsx
|   |-- core/
|   |   `-- api-client.ts
| `-- types/
|       |-- generated.ts
|       `-- index.ts
|
|-- tests/
| `-- e2e/
|       |-- chat-flow.spec.ts
|       `-- meal-generation.spec.ts
|
|-- types/
| |-- global-css.d.ts
| `-- prisma-client.d.ts
|
|-- .env.example
|-- .gitignore
|-- .prettierrc
|-- docker-compose.yml
|-- next-env.d.ts
|-- next.config.js
|-- package-lock.json
|-- package.json
|-- playwright.config.ts
|-- postcss.config.js
|-- README.md
|-- tailwind.config.ts
|-- tsconfig.json
|-- tsconfig.tsbuildinfo
`-- vitest.config.ts

Generated dependency and build-output directories are intentionally omitted from this map:

- `.git/`
- `.next/`
- `.venv/`
- `node_modules/`
- Python `__pycache__/` folders
