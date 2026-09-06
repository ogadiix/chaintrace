"""
Redis Client & Health Check
"""
import redis.asyncio as redis
from apps.api.src.core.config import settings

_redis_client: redis.Redis | None = None


def get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
    return _redis_client


async def check_redis_health() -> dict:
    """Verifies Redis connection."""
    try:
        client = get_redis_client()
        await client.ping()
        return {"status": "connected", "url": settings.REDIS_URL}
    except Exception as exc:
        if settings.REDIS_MOCK_FALLBACK:
            return {
                "status": "mock_mode",
                "info": "Redis unavailable; local in-memory fallback active",
                "details": str(exc)
            }
        return {"status": "disconnected", "error": str(exc)}


async def close_redis():
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None
