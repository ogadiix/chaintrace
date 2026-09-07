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
    # Keep schema intact and re-seed users so running dev server is unaffected by test runs
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    from apps.api.src.core.database import AsyncSessionLocal
    from apps.api.src.api.v1.auth import seed_demo_users_if_needed
    async with AsyncSessionLocal() as session:
        await seed_demo_users_if_needed(session)


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Resets rate limiting buckets before each test function."""
    from apps.api.src.core.rate_limiter import get_rate_limiter
    limiter = get_rate_limiter()
    limiter.reset()
    yield
    limiter.reset()
