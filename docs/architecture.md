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
│   │   │   │   ├── chat/page.tsx   # Interactive AI Assistant Portal
│   │   │   │   ├── map/page.tsx    # Geospatial Vet Finder Interface
│   │   │   │   ├── anatomy/page.tsx# Anatomical Visualizer Screen
│   │   │   │   └── planner/page.tsx# Nutritional Planning Interface
│   │   │   │
│   │   │   ├── components/         # Reusable UI Architecture
│   │   │   │   ├── ui/             # Global primitives (Buttons, Modals, Inputs)
│   │   │   │   ├── ChatWindow.tsx  # Dynamic streaming interface
│   │   │   │   ├── MapClient.tsx   # Geospatial vector mapping canvas
                   # Structured calendar view components
│   │   │   │
│   │   │   ├── core/               # App configuration, state hooks, and clients
│   │   │   │   └── api-client.ts   # Axios/Fetch implementation mapping backend gateway
│   │   │   │
│   │   │   ├── types/              # Static TypeScript Type Annotations
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── __tests__/          # Component-Level Test Suites (Vitest)
│   │   │       ├── ChatWindow.test.tsx
│   │   │       └── MealCalendar.test.tsx
│   │   │
│   │   ├── .env.local              # Local UI Environmental Configurations
│   │   ├── .gitignore              # Node-specific code tracking exclusions
│   │   ├── package.json            # Node dependency registry and executable scripts
│   │   ├── tailwind.config.ts      # UI layout styling declarations
│   │   └── vitest.config.ts        # Frontend test orchestrator settings
│   │
│   └── core-api/                   # System Computation & AI Processing Gateway (FastAPI)
│       ├── app/
│       │   ├── main.py             # ASGI Runtime Hook & Middleware Pipe Orchestrator
│       │   │
│       │   ├── core/               # Universal System Definitions
│       │   │   ├── config.py       # Structural environment configuration parser via Pydantic
│       │   │   └── security.py     # CORS configuration frameworks
│       │   │
│       │   ├── domains/            # Bounded Business Contexts (Domain Driven Design)
│       │   │   ├── triage/         # AI Conversations & Security Filtering Architecture
│       │   │   │   ├── router.py   # Endpoint handlers
│       │   │   │   ├── services.py # LangChain task runner setup
│       │   │   │   └── schemas.py  # Input/Output Pydantic validation boundaries
│       │   │   │
│       │   │   ├── locator/        # Geospatial Query Calculations
│       │   │   │   ├── router.py
│       │   │   │   └── services.py # MongoDB $near operations execution block
│       │   │   │
│       │   │   └── nutrition/      # Meal Configuration Synthesis
│       │   │       ├── router.py
│       │   │       └── services.py # Structured JSON payload parser via LangChain
│       │   │
│       │   └── infra/              # Core System Infrastructure Connectors
│       │       ├── database.py     # Asynchronous Motor Client Database connection pools
│       │       └── ai_clients.py   # Core Groq & Gemini client instance factories
│       │
│       ├── scripts/                # Data Lifespans & Structural Alteration Tools
│       │   ├── migrations/         # Up/Down Python Data Processing Modules
│       │   │   ├── __init__.py
│       │   │   └── 2026_06_18_init_pet_avatar_defaults.py
│       │   └── run_migration.py    # Master migration terminal execution script
│       │
│       ├── tests/                  # Backend Automated Testing Framework (Pytest)
│       │   ├── __init__.py
│       │   ├── conftest.py         # Universal backend mocks, clients, and setup objects
│       │   ├── test_triage.py      # Checks LangChain text triage and agent split routing
│       │   ├── test_locator.py     # Tests MongoDB coordinate lookup precision
│       │   └── test_nutrition.py   # Asserts structural validity of model outputs
│       │
│       ├── .env                    # Private API keys and local Mongo DB string references
│       ├── .gitignore              # Python-specific run tracing exclusions
│       ├── Dockerfile              # Multi-stage production runtime compiler configuration
│       └── requirements.txt        # Managed Python software dependencies configuration
│
├── tests/                          # Root Integration Verification Layer
│   └── e2e/                        # End-to-End Visual Automation Operations (Playwright)
│       ├── chat-flow.spec.ts       # Validates end-to-end chat inputs and component hand-offs
│       └── meal-generation.spec.ts # Asserts dynamic chart creation flow metrics
│
├── docker-compose.yml              # Multi-Service Container Orchestrator
└── README.md                       # Monorepo Entrypoint Documentationvetify/                             # Monorepo Workspace Root
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
│   │   │   │   ├── chat/page.tsx   # Interactive AI Assistant Portal
│   │   │   │   ├── map/page.tsx    # Geospatial Vet Finder Interface
│   │   │   │   ├── anatomy/page.tsx# Anatomical Visualizer Screen
│   │   │   │   └── planner/page.tsx# Nutritional Planning Interface
│   │   │   │
│   │   │   ├── components/         # Reusable UI Architecture
│   │   │   │   ├── ui/             # Global primitives (Buttons, Modals, Inputs)
│   │   │   │   ├── ChatWindow.tsx  # Dynamic streaming interface
│   │   │   │   ├── MapClient.tsx   # Geospatial vector mapping canvas
                   # Structured calendar view components
│   │   │   │
│   │   │   ├── core/               # App configuration, state hooks, and clients
│   │   │   │   └── api-client.ts   # Axios/Fetch implementation mapping backend gateway
│   │   │   │
│   │   │   ├── types/              # Static TypeScript Type Annotations
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── __tests__/          # Component-Level Test Suites (Vitest)
│   │   │       ├── ChatWindow.test.tsx
│   │   │       └── MealCalendar.test.tsx
│   │   │
│   │   ├── .env.local              # Local UI Environmental Configurations
│   │   ├── .gitignore              # Node-specific code tracking exclusions
│   │   ├── package.json            # Node dependency registry and executable scripts
│   │   ├── tailwind.config.ts      # UI layout styling declarations
│   │   └── vitest.config.ts        # Frontend test orchestrator settings
│   │
│   └── core-api/                   # System Computation & AI Processing Gateway (FastAPI)
│       ├── app/
│       │   ├── main.py             # ASGI Runtime Hook & Middleware Pipe Orchestrator
│       │   │
│       │   ├── core/               # Universal System Definitions
│       │   │   ├── config.py       # Structural environment configuration parser via Pydantic
│       │   │   └── security.py     # CORS configuration frameworks
│       │   │
│       │   ├── domains/            # Bounded Business Contexts (Domain Driven Design)
│       │   │   ├── triage/         # AI Conversations & Security Filtering Architecture
│       │   │   │   ├── router.py   # Endpoint handlers
│       │   │   │   ├── services.py # LangChain task runner setup
│       │   │   │   └── schemas.py  # Input/Output Pydantic validation boundaries
│       │   │   │
│       │   │   ├── locator/        # Geospatial Query Calculations
│       │   │   │   ├── router.py
│       │   │   │   └── services.py # MongoDB $near operations execution block
│       │   │   │
│       │   │   └── nutrition/      # Meal Configuration Synthesis
│       │   │       ├── router.py
│       │   │       └── services.py # Structured JSON payload parser via LangChain
│       │   │
│       │   └── infra/              # Core System Infrastructure Connectors
│       │       ├── database.py     # Asynchronous Motor Client Database connection pools
│       │       └── ai_clients.py   # Core Groq & Gemini client instance factories
│       │
│       ├── scripts/                # Data Lifespans & Structural Alteration Tools
│       │   ├── migrations/         # Up/Down Python Data Processing Modules
│       │   │   ├── __init__.py
│       │   │   └── 2026_06_18_init_pet_avatar_defaults.py
│       │   └── run_migration.py    # Master migration terminal execution script
│       │
│       ├── tests/                  # Backend Automated Testing Framework (Pytest)
│       │   ├── __init__.py
│       │   ├── conftest.py         # Universal backend mocks, clients, and setup objects
│       │   ├── test_triage.py      # Checks LangChain text triage and agent split routing
│       │   ├── test_locator.py     # Tests MongoDB coordinate lookup precision
│       │   └── test_nutrition.py   # Asserts structural validity of model outputs
│       │
│       ├── .env                    # Private API keys and local Mongo DB string references
│       ├── .gitignore              # Python-specific run tracing exclusions
│       ├── Dockerfile              # Multi-stage production runtime compiler configuration
│       └── requirements.txt        # Managed Python software dependencies configuration
│
├── tests/                          # Root Integration Verification Layer
│   └── e2e/                        # End-to-End Visual Automation Operations (Playwright)
│       ├── chat-flow.spec.ts       # Validates end-to-end chat inputs and component hand-offs
│       └── meal-generation.spec.ts # Asserts dynamic chart creation flow metrics
│
├── docker-compose.yml              # Multi-Service Container Orchestrator
└── README.md                       # Monorepo Entrypoint Documentation