"""
Database client — Supabase PostgreSQL via asyncpg.

Usage (in FastAPI routes/dependencies):
    from app.infra.database import get_db

    @router.get("/example")
    async def example(conn=Depends(get_db)):
        rows = await conn.fetch("SELECT * FROM users LIMIT 10")
        return rows
"""

import asyncpg
from app.core.config import settings

_pool: asyncpg.Pool | None = None


async def create_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(settings.DATABASE_URL)
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def get_db() -> asyncpg.Connection:
    """FastAPI dependency — yields a connection from the pool."""
    pool = await create_pool()
    async with pool.acquire() as conn:
        yield conn
