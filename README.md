# Vetify

Development workspace for the Vetify project: a Next.js frontend at the repo root and a Python backend in `backend/`.

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Frontend hosting: S3 + CloudFront
- Backend: FastAPI on Python
- Backend hosting: API Gateway + Lambda
- Database: OCI Autonomous Database
- Auth / APIs: NextAuth, Supabase client usage, and backend API routes
- AI / integrations: Google GenAI, Groq, LangChain
- Testing: Vitest, Playwright, Pytest

## Quick Start

### Prerequisites

- Node 16+ or 18+
- npm
- Python 3.10+ and virtualenv
- Docker, optional

### Frontend Development

```bash
npm install
npm run dev
```

### Backend Development

```powershell
cd backend
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Run Tests

Frontend:

```bash
npm run test
```

Backend:

```powershell
cd backend
. .venv/Scripts/Activate.ps1
pytest tests/ -v
```

### Docker Local Development

```bash
docker-compose up
```

## CI

CI lives in `.github/workflows/ci.yml` and runs tests only.

CD and deployment are intentionally not configured yet.
