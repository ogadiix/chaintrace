"""
API v1 Router Aggregator
"""
from apps.api.src.api.v1.adapters import router as adapters_router
from apps.api.src.api.v1.attribution import router as attribution_router
from apps.api.src.api.v1.audit import router as audit_router
from apps.api.src.api.v1.auth import router as auth_router
from apps.api.src.api.v1.blockchain import router as blockchain_router
from apps.api.src.api.v1.cases import router as cases_router
from apps.api.src.api.v1.graph import router as graph_router
from apps.api.src.api.v1.health import router as health_router
from apps.api.src.api.v1.intelligence import router as intelligence_router
from apps.api.src.api.v1.trace import router as trace_router
from fastapi import APIRouter

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(cases_router)
api_v1_router.include_router(audit_router)
api_v1_router.include_router(adapters_router)
api_v1_router.include_router(blockchain_router)
api_v1_router.include_router(graph_router)
api_v1_router.include_router(trace_router)
api_v1_router.include_router(intelligence_router)
api_v1_router.include_router(attribution_router)
