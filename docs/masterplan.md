🗺️ The Vetify Masterplan Overview
Phase | Focus Area | Primary Output -- | -- | --
Phase 1 | Foundation & Docker | A running local monorepo with Supabase PostgreSQL.
Phase 2 | The Prisma Bridge | schema.prisma generating TS & Python types.
Phase 3 | AI & Backend Logic | FastAPI domains (Triage, Locator, Nutrition). Phase 4 | Next.js Frontend | Interactive UI, Leaflet Map, and AI Chat Stream. Phase 5 | Playwright Testing | Automated E2E tests validating the full system. Phase 6 | Deployment | Multi-stage Dockerfiles pushed to the cloud.

Phase 1: Workspace Genesis & Infrastructure
The goal is to wire up the monorepo and get your containerized database running locally.

Step 1.1: Initialize the root directory (vetify/). Create your root package.json and configure the workspaces array to track the apps/ and packages/ folders.

Step 1.2: Scaffold your two applications. Run the Next.js setup inside apps/web/ and initialize a standard Python virtual environment inside apps/core-api/.

Step 1.3: Create the root docker-compose.yml file. Configure the Next.js frontend and FastAPI backend services. Use Supabase as your hosted PostgreSQL database (no local DB container needed).

Step 1.4: Run docker-compose up -d. Verify that your local database is spinning up successfully in isolation.

Phase 2: The Prisma Data Bridge
The goal is to define your database models once and generate the types for both applications.

Step 2.1: Inside apps/core-api/, install prisma and prisma-client-py. Initialize Prisma to create the apps/core-api/prisma/schema.prisma file.

Step 2.2: Write your schema models (User, Pet, Clinic, Appointment). Ensure your generators are set up to output the Python client locally and the TypeScript definitions to ../../web/src/types/prisma.

Step 2.3: Run `prisma migrate dev` to apply your models to the Supabase PostgreSQL instance.

Step 2.4: Run prisma generate. Verify that apps/web/src/types/ now contains your strict TypeScript definitions, confirming the frontend and backend are perfectly synced.

Phase 3: Core API & Domain Logic (FastAPI)
The goal is to build the Python backend brains using Domain-Driven Design.

Step 3.1 (Infrastructure): Build apps/core-api/app/infra/database.py to initialize the async Prisma client when FastAPI starts.

Step 3.2 (Nutrition): Build domains/nutrition/services.py. Implement the standard metabolic formula (RER = 70 \* (weight_in_kg)0.75) and expose it via a FastAPI router.

Step 3.3 (Locator): Build domains/locator/services.py. Write a script to seed test clinics with coordinate data into your database, and use PostGIS `ST_DWithin` for spatial queries.

Step 3.4 (Triage/AI): Build domains/triage/services.py. Initialize your LLM provider (Groq/OpenRouter) using LangChain. Build a custom LangChain tool that allows the AI to query your locator service.

Step 3.5: Expose the AI agent via domains/triage/router.py, formatting the output as a stream compatible with the Vercel AI SDK.

Phase 4: Frontend UI & Client Integration
The goal is to build the user-facing web app and consume the FastAPI endpoints.

Step 4.1: Build out your atomic UI components in apps/web/src/components/ui/ (Tailwind Buttons, Inputs, Layouts).

Step 4.2: Install leaflet and react-leaflet. Build the MapClient.tsx component. Use Axios or standard Fetch to hit your FastAPI locator endpoint, mapping the returned Prisma-typed clinics to interactive map pins.

Step 4.3: Build the ChatWindow.tsx interface. Implement the Vercel AI SDK useChat hook, pointing it directly at your FastAPI streaming endpoint.

Step 4.4: Configure Next.js rewrites (next.config.mjs) so local frontend calls to /api are seamlessly proxied to your FastAPI port. Verify the chat UI successfully triggers map updates.

Phase 5: Quality Assurance & E2E Testing
The goal is to automate system testing so you never deploy broken code.

Step 5.1: Set up packages/e2e-testing/ with its own package.json and initialize Playwright.

Step 5.2: Write chat-flow.spec.ts. Program Playwright to open a headless browser, type an emergency message into the chat, and assert that the map component correctly updates to show the nearest clinic.

Step 5.3: Set up your root GitHub Actions workflow (.github/workflows/test-pipeline.yml) to automatically run these Playwright tests every time you commit code.

Phase 6: Containerization & Cloud Deployment
The goal is to securely expose Vetify to the public.

Step 6.1: Write a multi-stage Dockerfile inside apps/web/ optimized for Next.js.

Step 6.2: Write a multi-stage Dockerfile inside apps/core-api/ optimized for Python, ensuring it installs the Prisma client correctly during the build step.

Step 6.3: Connect your GitHub repository to Vercel to host the Next.js frontend application (leveraging their CDN).

Step 6.4: Deploy your Python backend container to a persistent hosting provider (e.g., Render, Railway, or AWS) and connect it to your production Supabase PostgreSQL project.

Step 6.5: Add your production API keys, database URLs, and environment variables to both platforms. Verify the live application!
