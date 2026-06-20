# Vetify

Development workspace for the Vetify project: a Next.js frontend at the repo root and a Python backend in `backend/`.

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
