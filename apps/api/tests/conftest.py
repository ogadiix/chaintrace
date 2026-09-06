"""
Pytest Test Fixtures and Database Initialization
"""

import pytest
from apps.api.src.core.database import Base, engine


@pytest.fixture(autouse=True, scope="session")
async def init_test_db():
    """Initializes the database schema before running tests."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup after session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
