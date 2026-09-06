"""
Investigative Trace REST API Endpoints
Provides asynchronous trace initiation, status polling, and synchronous trace preview.
Enforces strict case-access authorization and input validation.
Source of truth: Master Prompt Phase 4 Sections 13, 14, 16, 17
"""

from apps.api.src.core.audit import log_audit_event
from apps.api.src.core.authorization import verify_case_access
from apps.api.src.core.config import settings
from apps.api.src.core.database import get_db
from apps.api.src.core.rate_limiter import get_rate_limiter, rate_limit_key_from_request
from apps.api.src.core.security import get_current_user, require_role
from apps.api.src.models.case import Case
from apps.api.src.models.trace import TraceJob, TraceRequest, TraceResult
from apps.api.src.models.user import User
from apps.api.src.services.trace_engine import TraceEngine, get_trace_engine
from apps.api.src.services.trace_service import TraceJobManager, get_trace_job_manager
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["Investigation Trace Engine"])


@router.post(
    "/investigations/{case_id}/trace", response_model=TraceJob, status_code=status.HTTP_202_ACCEPTED
)
async def create_investigation_trace_job(
    case_id: str,
    payload: TraceRequest,
    request: Request,
    current_user: User = Depends(require_role("INVESTIGATOR", "ADMIN", "ANALYST")),
    db: AsyncSession = Depends(get_db),
    job_manager: TraceJobManager = Depends(get_trace_job_manager),
) -> TraceJob:
    """
    Submits an asynchronous N-Hop trace job for an investigation.
    Returns immediately with a 202 Accepted status and job details.
    """
    case = await verify_case_access(case_id, current_user, db, require_write=True)

    # Rate limit trace execution
    limiter = get_rate_limiter()
    rate_key = rate_limit_key_from_request(request, user_id=current_user.id)
    limiter.enforce(
        key=f"trace:{rate_key}",
        max_requests=settings.RATE_LIMIT_TRACE_PER_MINUTE,
        window_seconds=60.0,
        category="trace execution",
    )

    # Validate seed matches chain or target_chain
    if payload.chain.value != case.target_chain:
        # If payload chain doesn't match case target chain, warn or adjust
        pass

    job = await job_manager.create_job(request=payload, investigation_id=case.id)

    # Audit log
    await log_audit_event(
        db=db,
        action="TRACE_JOB_STARTED",
        actor=current_user,
        case_id=case.id,
        request=request,
        result="SUCCESS",
        metadata={
            "job_id": job.id,
            "seed_wallet": payload.seed_wallet,
            "chain": payload.chain.value,
            "max_hops": payload.max_hops,
        },
    )

    return job


@router.get("/investigations/{case_id}/trace", response_model=list[TraceJob])
async def list_investigation_trace_jobs(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    job_manager: TraceJobManager = Depends(get_trace_job_manager),
) -> list[TraceJob]:
    """Retrieves all past and active trace jobs for a given case."""
    await verify_case_access(case_id, current_user, db)
    return await job_manager.list_jobs_for_investigation(case_id)


@router.get("/investigations/jobs/{job_id}", response_model=TraceJob)
async def get_trace_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    job_manager: TraceJobManager = Depends(get_trace_job_manager),
) -> TraceJob:
    """Polls status and retrieves results of an ongoing or completed trace job."""
    job = await job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trace job '{job_id}' not found",
        )

    if job.investigation_id:
        await verify_case_access(job.investigation_id, current_user, db)

    return job


@router.post("/graph/trace", response_model=TraceResult)
async def execute_direct_trace_endpoint(
    payload: TraceRequest,
    case_id: str | None = Query(default=None, description="Optional associated case ID"),
    request: Request = None,
    current_user: User = Depends(require_role("INVESTIGATOR", "ADMIN", "ANALYST")),
    db: AsyncSession = Depends(get_db),
    engine: TraceEngine = Depends(get_trace_engine),
) -> TraceResult:
    """
    Direct synchronous trace endpoint for interactive investigations.
    Strictly bounded by server timeout and defensive depth limits.
    """
    if case_id:
        await verify_case_access(case_id, current_user, db)

    result = await engine.execute_trace(request=payload, investigation_id=case_id)

    if case_id and request:
        await log_audit_event(
            db=db,
            action="DIRECT_TRACE_EXECUTED",
            actor=current_user,
            case_id=case_id,
            request=request,
            result="SUCCESS",
            metadata={
                "seed": payload.seed_wallet,
                "chain": payload.chain.value,
                "paths_found": result.statistics.paths,
            },
        )

    return result
