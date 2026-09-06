"""
API v1 Router Aggregator
"""
from apps.api.src.api.v1.health import router as health_router
from fastapi import APIRouter

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health_router)
