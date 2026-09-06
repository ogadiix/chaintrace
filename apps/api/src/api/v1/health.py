"""
System Health & Diagnostics Endpoint
"""

from datetime import UTC, datetime

from apps.api.src.core.config import settings
from apps.api.src.core.database import check_db_health
from apps.api.src.core.neo4j import check_neo4j_health
from apps.api.src.core.redis import check_redis_health
from fastapi import APIRouter

router = APIRouter()


@router.get("/health", tags=["Diagnostics"])
async def get_system_health():
    db_status = await check_db_health()
    neo4j_status = await check_neo4j_health()
    redis_status = await check_redis_health()

    # Determine overall system health
    is_unhealthy = any(
        s.get("status") == "disconnected" for s in [db_status, neo4j_status, redis_status]
    )
    is_degraded = any(
        s.get("status") in ("mock_mode", "fallback_mode")
        for s in [db_status, neo4j_status, redis_status]
    )

    overall_status = "unhealthy" if is_unhealthy else ("degraded" if is_degraded else "healthy")

    return {
        "status": overall_status,
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(UTC).isoformat(),
        "services": {
            "database": db_status,
            "neo4j": neo4j_status,
            "redis": redis_status,
        },
    }
