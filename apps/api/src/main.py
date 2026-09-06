"""
ChainTrace API — Main FastAPI Application
Security-hardened with CORS restrictions, defensive headers,
request size limits, and safe error handling.
"""

import logging
import traceback
from contextlib import asynccontextmanager

from apps.api.src.api.v1.auth import seed_demo_users_if_needed
from apps.api.src.api.v1.router import api_v1_router
from apps.api.src.core.config import settings
from apps.api.src.core.database import AsyncSessionLocal, Base, engine
from apps.api.src.core.neo4j import close_neo4j_driver, init_neo4j_schema
from apps.api.src.core.redis import close_redis
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database schema is created and demo credentials seeded
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_demo_users_if_needed(session)

    await init_neo4j_schema()

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

# CORS Middleware — restricted methods and headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Enforces comprehensive defensive security response headers."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "0"  # Modern browsers: CSP is preferred
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none'"
    )
    return response


@app.middleware("http")
async def request_size_limit_middleware(request: Request, call_next):
    """Reject request bodies that exceed the configured size limit."""
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > settings.MAX_REQUEST_BODY_BYTES:
                return JSONResponse(
                    status_code=413,
                    content={"detail": "Request body too large"},
                )
        except ValueError:
            pass
    return await call_next(request)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catches all unhandled exceptions and returns a safe generic error.
    Full details are logged server-side but never exposed to clients.
    Prevents leaking stack traces, SQL, Cypher, filesystem paths, or credentials.
    """
    # Log full error details server-side
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        str(exc),
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal error occurred. Please try again later.",
        },
    )


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
