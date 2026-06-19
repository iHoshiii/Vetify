from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.core.security import configure_cors
from app.domains.locator.router import router as locator_router
from app.domains.nutrition.router import router as nutrition_router
from app.domains.triage.router import router as triage_router
from app.infra.database import get_mongo_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and graceful shutdown."""
    # Startup: verify database connectivity
    client = get_mongo_client()
    await client.admin.command("ping")
    print(f"✓ Connected to MongoDB: {settings.MONGODB_DB_NAME}")
    yield
    # Shutdown: release all connections
    client.close()
    print("✓ MongoDB connection closed.")


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered veterinary companion backend service.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

configure_cors(app)

# --- Domain Routers ---
app.include_router(triage_router)
app.include_router(locator_router)
app.include_router(nutrition_router)


@app.get("/health", tags=["System"])
async def health_check():
    """Liveness probe for container orchestration."""
    return {"status": "healthy", "service": settings.APP_NAME}
