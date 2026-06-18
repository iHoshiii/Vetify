vetify/                             # Monorepo Workspace Root
│
├── .github/                        # Continuous Integration & Delivery Configurations
│   └── workflows/
│       ├── test-pipeline.yml       # Automated verification engine (Pytest, Vitest, Playwright)
│       └── production-deploy.yml   # Infrastructure delivery trigger
│
├── apps/                           # Isolated Deployable Service Domains
│   │
│   ├── web/                        # Presentation & Data Mutation Layer (Next.js 14+)
│   │   ├── prisma/                 # Database Schema & Declarative Infrastructure
│   │   │   ├── schema.prisma       # Single source of truth for database configurations
│   │   │   └── seed.ts             # Local database provisioning script
│   │   │
│   │   ├── public/                 # Immutable Static Workspace Assets
│   │   │   └── anatomy/            # Structured animal vector graphics (SVGs)
│   │   │
│   │   ├── src/
│   │   │   ├── app/                # App Router Layout & Concrete Page Nodes
│   │   │   │   ├── layout.tsx      # Core viewport shell & global state provider
│   │   │   │   ├── page.tsx        # Application landing stage
│   │   │   │   ├── globals.css     # Global stylesheet reset & base tokens
│   │   │   │   ├── chat/page.tsx   # Interactive AI Assistant Portal
│   │   │   │   ├── map/page.tsx    # Geospatial Vet Finder Interface
│   │   │   │   ├── anatomy/page.tsx# Anatomical Visualizer Screen
│   │   │   │   └── planner/page.tsx# Nutritional Planning Interface
│   │   │   │
│   │   │   ├── components/         # Reusable UI Architecture
│   │   │   │   ├── ui/             # Global primitives (Buttons, Modals, Inputs)
│   │   │   │   │   ├── index.ts    # Barrel re-export for all UI primitives
│   │   │   │   │   └── Button.tsx  # Base button with variant & loading state
│   │   │   │   ├── ChatWindow.tsx  # Dynamic streaming chat interface
│   │   │   │   └── MapClient.tsx   # Geospatial vector mapping canvas
│   │   │   │
│   │   │   ├── core/               # App configuration, state hooks, and clients
│   │   │   │   └── api-client.ts   # Typed Fetch implementation mapping backend gateway
│   │   │   │
│   │   │   ├── types/              # Static TypeScript Type Annotations
│   │   │   │   └── index.ts        # Domain models & API response wrappers
│   │   │   │
│   │   │   └── __tests__/          # Component-Level Test Suites (Vitest)
│   │   │       ├── setup.ts        # Jest-DOM matchers & global test configuration
│   │   │       ├── ChatWindow.test.tsx
│   │   │       └── MealCalendar.test.tsx
│   │   │
│   │   ├── .env.example            # Environment variable template (committed)
│   │   ├── .gitignore              # Node-specific code tracking exclusions
│   │   ├── next.config.ts          # Next.js runtime & build configuration
│   │   ├── package.json            # Node dependency registry and executable scripts
│   │   ├── tailwind.config.ts      # UI layout styling declarations
│   │   ├── tsconfig.json           # TypeScript compiler options
│   │   └── vitest.config.ts        # Frontend test orchestrator settings
│   │
│   └── core-api/                   # System Computation & AI Processing Gateway (FastAPI)
│       ├── app/
│       │   ├── __init__.py
│       │   ├── main.py             # ASGI entrypoint — lifespan, CORS, router registration
│       │   │
│       │   ├── core/               # Universal System Definitions
│       │   │   ├── __init__.py
│       │   │   ├── config.py       # Pydantic-Settings environment configuration parser
│       │   │   └── security.py     # CORS middleware configuration
│       │   │
│       │   ├── domains/            # Bounded Business Contexts (Domain Driven Design)
│       │   │   ├── __init__.py
│       │   │   ├── triage/         # AI Conversations & Safety Filtering
│       │   │   │   ├── __init__.py
│       │   │   │   ├── router.py   # Endpoint handlers
│       │   │   │   ├── services.py # Groq LLM task runner
│       │   │   │   └── schemas.py  # Input/Output Pydantic validation models
│       │   │   │
│       │   │   ├── locator/        # Geospatial Query Calculations
│       │   │   │   ├── __init__.py
│       │   │   │   ├── router.py
│       │   │   │   └── services.py # MongoDB $near operations execution
│       │   │   │
│       │   │   └── nutrition/      # Meal Configuration Synthesis
│       │   │       ├── __init__.py
│       │   │       ├── router.py
│       │   │       └── services.py # Gemini structured JSON payload parser
│       │   │
│       │   └── infra/              # Core System Infrastructure Connectors
│       │       ├── __init__.py
│       │       ├── database.py     # Async Motor MongoDB client & connection pools
│       │       └── ai_clients.py   # Groq & Gemini client instance factories
│       │
│       ├── scripts/                # Data Lifecycle & Schema Migration Tools
│       │   ├── run_migration.py    # CLI migration runner script
│       │   └── migrations/         # Up/Down Python migration modules
│       │       ├── __init__.py
│       │       └── 2026_06_18_init_pet_avatar_defaults.py
│       │
│       ├── tests/                  # Backend Automated Testing Framework (Pytest)
│       │   ├── __init__.py
│       │   ├── conftest.py         # Universal fixtures — mocked DB, AI clients, test app
│       │   ├── test_triage.py      # Checks LangChain triage routing and reply structure
│       │   ├── test_locator.py     # Tests MongoDB coordinate lookup precision
│       │   └── test_nutrition.py   # Asserts structural validity of model outputs
│       │
│       ├── .env.example            # Environment variable template (committed)
│       ├── .gitignore              # Python-specific exclusions
│       ├── Dockerfile              # Multi-stage production runtime image
│       └── requirements.txt        # Pinned Python dependency manifest
│
├── tests/                          # Root Integration Verification Layer
│   └── e2e/                        # End-to-End Visual Automation (Playwright)
│       ├── chat-flow.spec.ts       # Validates end-to-end chat input and reply hand-off
│       └── meal-generation.spec.ts # Asserts dynamic meal plan chart creation flow
│
├── .gitignore                      # Root-level exclusion rules (Python + Node combined)
├── docker-compose.yml              # Multi-Service Container Orchestrator
├── package.json                    # Monorepo workspace root (npm workspaces + Playwright)
├── playwright.config.ts            # E2E test runner configuration (browsers, baseURL, CI)
└── README.md                       # Monorepo Entrypoint Documentation

---

Repository notes and conventions
- Canonical frontend lives in `apps/web/` (moved from a legacy root `src/`). Do not keep duplicate copies at repository root.
- Canonical backend lives in `apps/core-api/` (consolidated from `backend/`). A backup was created before the move and is kept at `archive/backend_backup_2026-06-18.zip`.
- Archives of removed or condensed folders are kept under `archive/` as timestamped zip files for safe rollback.

Tech & Tooling Highlights
- Frontend: Next.js 14+, React 18+, TypeScript, Tailwind CSS, PostCSS (requires `autoprefixer`), Vitest for unit tests, Playwright for E2E.
- Backend: FastAPI, Uvicorn, Pydantic, Motor (async MongoDB), LangChain adapters for AI clients.
- Database: Prisma schema is present under `apps/web/prisma/` — run `prisma generate` and install `@prisma/client` if server-side Prisma is enabled.

Testing & CI Notes
- Vitest configuration was narrowed to project tests to avoid running unrelated tests in `node_modules` and Playwright suites during unit runs. See `apps/web/vitest.config.ts`.
- Backend tests now live in `apps/core-api/tests/` and can be run with `pytest` after installing `apps/core-api/requirements.txt`.

Recommended next steps after consolidation
- Update `docker-compose.yml` if CI/CD or local development relies on service names or build contexts (should reference `./apps/web` and `./apps/core-api`).
- Run a production build for the frontend to verify: from repository root, run the workspace build command defined in `package.json` (e.g., `pnpm --filter @workspace/web build` or `npm --workspace apps/web run build`).
- Install Python deps into a virtualenv and run `pytest` in `apps/core-api/` to validate the backend move.

If you want, I can update `docker-compose.yml` now and run the backend tests in a venv.