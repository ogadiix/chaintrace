"""
Database Connection & Session Management
Provides async SQLAlchemy engine and session dependency.
"""
import os
from collections.abc import AsyncGenerator

from apps.api.src.core.config import settings
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

# Ensure data directory exists if SQLite is used
if "sqlite" in settings.DATABASE_URL:
    os.makedirs("./data", exist_ok=True)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def check_db_health() -> dict:
    """Verifies database connectivity."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {
            "status": "connected",
            "engine": "sqlite" if "sqlite" in settings.DATABASE_URL else "postgresql"
        }
    except Exception as exc:  # noqa: BLE001
        if settings.DATABASE_FALLBACK_SQLITE:
            return {
                "status": "fallback_mode",
                "engine": "sqlite_fallback_active",
                "error": str(exc)
            }
        return {
            "status": "disconnected",
            "engine": "unknown",
            "error": str(exc)
        }
