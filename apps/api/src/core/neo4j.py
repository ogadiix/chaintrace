"""
Neo4j Graph Database Driver & Health Check
"""
from apps.api.src.core.config import settings
from neo4j import AsyncDriver, AsyncGraphDatabase

_driver: AsyncDriver | None = None


def get_neo4j_driver() -> AsyncDriver | None:
    global _driver
    if _driver is None and settings.NEO4J_URI:
        try:
            _driver = AsyncGraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
        except Exception:
            _driver = None
    return _driver


async def check_neo4j_health() -> dict:
    """Verifies connectivity to Neo4j graph instance."""
    driver = get_neo4j_driver()
    if driver is None:
        if settings.NEO4J_MOCK_FALLBACK:
            return {"status": "mock_mode", "info": "Local in-memory graph fallback active"}
        return {"status": "disconnected", "error": "Driver uninitialized"}

    try:
        await driver.verify_connectivity()
        return {"status": "connected", "uri": settings.NEO4J_URI}
    except Exception as exc:
        if settings.NEO4J_MOCK_FALLBACK:
            return {
                "status": "mock_mode",
                "info": "Neo4j unavailable; mock/in-memory graph fallback active",
                "details": str(exc)
            }
        return {"status": "disconnected", "error": str(exc)}


async def close_neo4j_driver():
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None
