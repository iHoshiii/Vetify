from app.core.config import settings
from app.core.security import configure_cors
from app.domains.locator.router import router as locator_router
from app.domains.nutrition.router import router as nutrition_router
from app.domains.triage.router import router as triage_router
from app.infra.database import get_mongo_client
from contextlib import asynccontextmanager
from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = get_mongo_client()
    try:
        await client.admin.command("ping")
        yield
    finally:
        client.close()


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

configure_cors(app)

app.include_router(triage_router)
app.include_router(locator_router)
app.include_router(nutrition_router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": settings.APP_NAME}
