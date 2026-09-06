"""
Risk Assessment REST API Endpoints
Provides automated scoring, history tracking, and manual override capabilities.
Enforces strict RBAC and audit logging.
Source of truth: Master Prompt Phase 7 Sections 16, 20, 21, 22
"""

from typing import Any

from apps.api.src.core.audit import log_audit_event
from apps.api.src.core.database import get_db
from apps.api.src.core.security import get_current_user, require_role
from apps.api.src.models.case import Case
from apps.api.src.models.risk import (
    RiskAssessment,
    RiskOverrideRequest,
)
from apps.api.src.models.trace import TraceRequest
from apps.api.src.models.user import User
from apps.api.src.services.attribution_service import (
    AttributionService,
    get_attribution_service,
)
from apps.api.src.services.intelligence import (
    IntelligenceEngine,
    get_intelligence_engine,
)
from apps.api.src.services.risk_engine import RiskEngine, get_risk_engine
from apps.api.src.services.trace_engine import TraceEngine, get_trace_engine
from chaintrace_shared import BlockchainType
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["Investigation Risk Engine"])


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


@router.post("/investigations/{case_id}/risk/analyze", response_model=RiskAssessment)
async def analyze_case_risk_endpoint(
    case_id: str,
    request: Request,
    max_hops: int = Query(default=4, ge=1, le=7),
    config: dict[str, Any] | None = Body(default=None),
    current_user: User = Depends(require_role("INVESTIGATOR", "ADMIN", "ANALYST")),
    db: AsyncSession = Depends(get_db),
    trace_engine: TraceEngine = Depends(get_trace_engine),
    intel_engine: IntelligenceEngine = Depends(get_intelligence_engine),
    attr_service: AttributionService = Depends(get_attribution_service),
    risk_engine: RiskEngine = Depends(get_risk_engine),
) -> RiskAssessment:
    """
    Executes holistic risk evaluation across Trace, Intelligence, and VASP layers.
    Yields explainable score [0-100] with evidence links.
    """
    case = await _verify_case(case_id, db)

    if not case.suspect_wallet:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Case does not have a suspect wallet configured for risk analysis",
        )

    # 1. Bounded Trace
    trace_req = TraceRequest(
        chain=BlockchainType(case.target_chain),
        seed_wallet=case.suspect_wallet,
        max_hops=max_hops,
    )
    trace_result = await trace_engine.execute_trace(trace_req, investigation_id=case_id)

    # 2. Intelligence Findings
    intel_result = intel_engine.analyze(trace_result, investigation_id=case_id)

    # 3. Attribution Analysis
    attr_result = await attr_service.analyze_trace_attributions(
        trace_result, investigation_id=case_id
    )

    # 4. Risk Scoring
    assessment = risk_engine.evaluate_risk(
        investigation_id=case_id,
        seed_wallet=case.suspect_wallet,
        trace_result=trace_result,
        intel_result=intel_result,
        attr_result=attr_result,
        config=config,
    )

    # 5. Persist to historical timeline
    await risk_engine.record_assessment(assessment)

    # 6. Audit Logging
    await log_audit_event(
        db=db,
        action="RISK_ANALYSIS_EXECUTED",
        actor=current_user,
        case_id=case_id,
        request=request,
        result="SUCCESS",
        metadata={
            "score": assessment.score,
            "risk_level": assessment.risk_level.value,
            "contributions_count": len(assessment.contributions),
        },
    )

    return assessment


@router.get("/investigations/{case_id}/risk", response_model=RiskAssessment)
async def get_case_latest_risk(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    trace_engine: TraceEngine = Depends(get_trace_engine),
    intel_engine: IntelligenceEngine = Depends(get_intelligence_engine),
    attr_service: AttributionService = Depends(get_attribution_service),
    risk_engine: RiskEngine = Depends(get_risk_engine),
) -> RiskAssessment:
    """Retrieves latest risk assessment for the case (evaluates automatically if none recorded)."""
    case = await _verify_case(case_id, db)

    latest = await risk_engine.get_latest_assessment(case_id)
    if latest:
        return latest

    if not case.suspect_wallet:
        return RiskAssessment(
            assessment_id=f"risk_empty_{case_id}",
            investigation_id=case_id,
            seed_wallet="",
            score=0,
            risk_level="LOW",
            contributions=[],
            reasons=["No suspect wallet configured"],
            created_at="",
            updated_at="",
        )

    # Compute fresh assessment
    trace_req = TraceRequest(
        chain=BlockchainType(case.target_chain),
        seed_wallet=case.suspect_wallet,
        max_hops=4,
    )
    trace_result = await trace_engine.execute_trace(trace_req, investigation_id=case_id)
    intel_result = intel_engine.analyze(trace_result, investigation_id=case_id)
    attr_result = await attr_service.analyze_trace_attributions(
        trace_result, investigation_id=case_id
    )

    assessment = risk_engine.evaluate_risk(
        investigation_id=case_id,
        seed_wallet=case.suspect_wallet,
        trace_result=trace_result,
        intel_result=intel_result,
        attr_result=attr_result,
    )
    await risk_engine.record_assessment(assessment)
    return assessment


@router.get("/investigations/{case_id}/risk/history", response_model=list[RiskAssessment])
async def get_case_risk_history(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    risk_engine: RiskEngine = Depends(get_risk_engine),
) -> list[RiskAssessment]:
    """Retrieves chronological risk assessment history for the case."""
    await _verify_case(case_id, db)
    return await risk_engine.get_assessment_history(case_id)


@router.post("/investigations/{case_id}/risk/override", response_model=RiskAssessment)
async def manual_risk_override_endpoint(
    case_id: str,
    payload: RiskOverrideRequest,
    request: Request,
    current_user: User = Depends(require_role("INVESTIGATOR", "ADMIN")),
    db: AsyncSession = Depends(get_db),
    risk_engine: RiskEngine = Depends(get_risk_engine),
) -> RiskAssessment:
    """Applies investigator manual risk level override while preserving automated score."""
    await _verify_case(case_id, db)

    updated = await risk_engine.apply_manual_override(
        investigation_id=case_id,
        user_id=current_user.id,
        override_level=payload.override_level,
        reason=payload.reason,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No prior risk assessment found to override. Run risk analysis first.",
        )

    await log_audit_event(
        db=db,
        action="MANUAL_RISK_OVERRIDE",
        actor=current_user,
        case_id=case_id,
        request=request,
        result="SUCCESS",
        metadata={
            "override_level": payload.override_level.value,
            "original_level": updated.manual_override.original_level.value,
            "reason": payload.reason,
        },
    )

    return updated
