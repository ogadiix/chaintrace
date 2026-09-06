"""
ChainTrace API — Main FastAPI Application
"""
from contextlib import asynccontextmanager

from apps.api.src.api.v1.router import api_v1_router
from apps.api.src.core.config import settings
from apps.api.src.core.neo4j import close_neo4j_driver
from apps.api.src.core.redis import close_redis
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    yield
    # Shutdown cleanup
    await close_neo4j_driver()
    await close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="ChainTrace — Blockchain Intelligence Platform for Cryptocurrency Fraud Investigation (SIH 2026)",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Enforces defensive security response headers."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Include API v1 Router
app.include_router(api_v1_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "platform": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "docs": "/docs" if settings.DEBUG else "disabled",
    }
