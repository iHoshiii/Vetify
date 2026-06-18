vetify/                             # Monorepo Workspace Root
│
├── .github/workflows/              # Automated CI/CD Pipelines
│   ├── test-pipeline.yml           # Runs Vitest, Pytest, and Playwright
│   └── production-deploy.yml       # Provisions production containers
│
├── apps/                           # Isolated Service Domains
│   │
│   ├── web/                        # Pure Presentation & UX Layer (Next.js 14+)
│   │   ├── public/anatomy/         # Immutable vector assets (SVGs)
│   │   ├── src/
│   │   │   ├── app/                # Next.js App Router Nodes
│   │   │   │   ├── layout.tsx      # App shell & global context providers
│   │   │   │   ├── page.tsx        # Landing view
│   │   │   │   ├── chat/page.tsx   # AI Triage Interface
│   │   │   │   ├── map/page.tsx    # Vet Locator Map
│   │   │   │   └── planner/page.tsx# Nutrition Dashboard
│   │   │   │
│   │   │   ├── components/         # Reusable UI Components (No Barrel Files)
│   │   │   │   ├── ui/             # Atomic, primitive style leaf nodes
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   └── Input.tsx
│   │   │   │   ├── ChatWindow.tsx  # Interactive stream processor
│   │   │   │   └── MapClient.tsx   # Geospatial render canvas
│   │   │   │
│   │   │   ├── core/
│   │   │   │   └── api-client.ts   # Axios/Fetch wrapper talking exclusively to FastAPI
│   │   │   │
│   │   │   └── types/
│   │   │       ├── index.ts        # Local UI-only state typings
│   │   │       └── generated.ts    # AUTO-GENERATED data contracts from FastAPI
│   │   │
│   │   ├── package.json
│   │   ├── tailwind.config.ts
│   │   └── vitest.config.ts
│   │
│   └── core-api/                   # Core Computation & AI Gateway (FastAPI)
│       ├── app/
│       │   ├── main.py             # ASGI system initialization & global CORS routing
│       │   ├── core/               # Pydantic environment configuration & security
│       │   │   ├── config.py
│       │   │   └── security.py
│       │   │
│       │   ├── domains/            # Bounded Business Contexts (Domain Driven Design)
│       │   │   ├── triage/         # AI Conversations & Prompt Safety
│       │   │   │   ├── router.py
│       │   │   │   ├── services.py # Interacts with Groq
│       │   │   │   └── schemas.py  # Input/Output Pydantic validation models
│       │   │   ├── locator/        # Geospatial Processing
│       │   │   │   ├── router.py
│       │   │   │   └── services.py # Native Mongo coordinate indexing
│       │   │   └── nutrition/      # Meal Plan Synthesis
│       │   │       ├── router.py
│       │   │       └── services.py # Structure extraction from Gemini
│       │   │
│       │   └── infra/              # Explicit Infrastructure Gateway
│       │       ├── database.py     # Single Async Motor/MongoDB connection manager
│       │       └── ai_clients.py   # Heavy SDK model initialization (Gemini / Groq)
│       │
│       ├── scripts/
│       │   ├── generate_ts.py      # Script to parse Pydantic schemas -> apps/web/types/generated.ts
│       │   └── migrations/         # Python-based data migrations & defaults
│       │
│       ├── tests/                  # Pytest Framework Integration
│       │   ├── conftest.py         # Mock system engines & application lifecycles
│       │   └── test_triage.py
│       │
│       ├── Dockerfile              # Multi-stage container file
│       └── requirements.txt
│
├── tests/e2e/                      # Playwright System Testing (Cross-service integration)
│   ├── chat-flow.spec.ts
│   └── meal-generation.spec.ts
│
├── docker-compose.yml              # Local Multi-Service Orchestrator (web, core-api, mongodb)
├── package.json                    # Root monorepo workspace configurations
└── playwright.config.ts            # High-level cross-domain test engine definitions

*** End Patch