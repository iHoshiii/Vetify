from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from app.core.config import settings


def configure_cors(app: FastAPI) -> None:
    """Attach CORS middleware to the FastAPI application."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
