"""
Intelligence REST API Endpoints
Provides analysis of case graph traces and queries for discovered suspicious patterns.
Enforces strict RBAC and evidentiary traceability.
Source of truth: Master Prompt Phase 5 Sections 16, 17, 21
"""
from typing import Any

from apps.api.src.core.audit import log_audit_event
from apps.api.src.core.database import get_db
from apps.api.src.core.security import get_current_user, require_role
from apps.api.src.models.case import Case
from apps.api.src.models.intelligence import (
    IntelligenceAnalysisResult,
    IntelligenceJob,
)
from apps.api.src.models.trace import TraceRequest
from apps.api.src.models.user import User
from apps.api.src.services.intelligence import IntelligenceEngine, get_intelligence_engine
from apps.api.src.services.trace_engine import TraceEngine, get_trace_engine
from chaintrace_shared import BlockchainType
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/investigations", tags=["Intelligence Engine"])


async def _verify_case(case_id: str, db: AsyncSession) -> Case:
    stmt = select(Case).where(Case.id == case_id)
    res = await db.execute(stmt)
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID '{case_id}' not found",
        )
    return case


@router.post("/{case_id}/intelligence/analyze", response_model=IntelligenceAnalysisResult)
async def analyze_case_intelligence_endpoint(
    case_id: str,
    request: Request,
    max_hops: int = Query(default=4, ge=1, le=7),
    config: dict[str, Any] | None = Body(default=None),
    current_user: User = Depends(require_role("INVESTIGATOR", "ADMIN", "ANALYST")),
    db: AsyncSession = Depends(get_db),
    trace_engine: TraceEngine = Depends(get_trace_engine),
    intel_engine: IntelligenceEngine = Depends(get_intelligence_engine),
) -> IntelligenceAnalysisResult:
    """
    Executes forensic pattern detection rules against the case graph.
    Returns explainable findings with direct links to blockchain evidence.
    """
    case = await _verify_case(case_id, db)

    if not case.suspect_wallet:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Case does not have a suspect wallet configured for intelligence analysis",
        )

    # 1. Bounded trace of suspect wallet
    trace_req = TraceRequest(
        chain=BlockchainType(case.target_chain),
        seed_wallet=case.suspect_wallet,
        max_hops=max_hops,
    )
    trace_result = await trace_engine.execute_trace(trace_req, investigation_id=case_id)

    # 2. Analyze extracted features via Intelligence Rule Engine
    analysis_result = intel_engine.analyze(
        trace_result=trace_result,
        investigation_id=case_id,
        config=config,
    )

    # 3. Audit log
    await log_audit_event(
        db=db,
        action="INTELLIGENCE_ANALYSIS_EXECUTED",
        actor=current_user,
        case_id=case_id,
        request=request,
        result="SUCCESS",
        metadata={
            "findings_count": len(analysis_result.findings),
            "rules_executed": analysis_result.rules_executed,
            "wallets_analyzed": analysis_result.statistics.get("wallets_analyzed", 0),
        },
    )

    return analysis_result


@router.get("/{case_id}/intelligence", response_model=IntelligenceAnalysisResult)
async def get_case_intelligence_findings(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    trace_engine: TraceEngine = Depends(get_trace_engine),
    intel_engine: IntelligenceEngine = Depends(get_intelligence_engine),
) -> IntelligenceAnalysisResult:
    """
    Retrieves current intelligence findings for the case's fund flow graph.
    """
    case = await _verify_case(case_id, db)

    if not case.suspect_wallet:
        return IntelligenceAnalysisResult(
            investigation_id=case_id,
            findings=[],
            statistics={"total_findings": 0},
            rules_executed=[],
            analysis_timestamp="",
            engine_version="1.0.0",
        )

    trace_req = TraceRequest(
        chain=BlockchainType(case.target_chain),
        seed_wallet=case.suspect_wallet,
        max_hops=4,
    )
    trace_result = await trace_engine.execute_trace(trace_req, investigation_id=case_id)

    return intel_engine.analyze(
        trace_result=trace_result,
        investigation_id=case_id,
    )


@router.post("/{case_id}/intelligence/jobs", response_model=IntelligenceJob, status_code=status.HTTP_202_ACCEPTED)
async def create_async_intelligence_job(
    case_id: str,
    request: Request,
    max_hops: int = Query(default=4, ge=1, le=7),
    config: dict[str, Any] | None = Body(default=None),
    current_user: User = Depends(require_role("INVESTIGATOR", "ADMIN", "ANALYST")),
    db: AsyncSession = Depends(get_db),
    trace_engine: TraceEngine = Depends(get_trace_engine),
    intel_engine: IntelligenceEngine = Depends(get_intelligence_engine),
) -> IntelligenceJob:
    """
    Asynchronously submits an intelligence analysis job.
    """
    case = await _verify_case(case_id, db)
    trace_req = TraceRequest(
        chain=BlockchainType(case.target_chain),
        seed_wallet=case.suspect_wallet,
        max_hops=max_hops,
    )
    trace_result = await trace_engine.execute_trace(trace_req, investigation_id=case_id)

    job = await intel_engine.create_job(
        investigation_id=case_id,
        trace_result=trace_result,
        config=config,
    )

    await log_audit_event(
        db=db,
        action="INTELLIGENCE_JOB_SUBMITTED",
        actor=current_user,
        case_id=case_id,
        request=request,
        result="SUCCESS",
        metadata={"job_id": job.id},
    )

    return job


@router.get("/intelligence/jobs/{job_id}", response_model=IntelligenceJob)
async def get_intelligence_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    intel_engine: IntelligenceEngine = Depends(get_intelligence_engine),
) -> IntelligenceJob:
    """Polls status and output of an asynchronous intelligence job."""
    job = await intel_engine.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intelligence job '{job_id}' not found",
        )
    return job
