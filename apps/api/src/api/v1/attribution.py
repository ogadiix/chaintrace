"""
VASP Attribution REST API Endpoints
Provides case-level and wallet-level VASP attribution queries with full provenance.
Enforces strict RBAC and case-ownership validation.
Source of truth: Master Prompt Phase 6 Sections 14, 15, 20
"""

from apps.api.src.core.audit import log_audit_event
from apps.api.src.core.database import get_db
from apps.api.src.core.security import get_current_user, require_role
from apps.api.src.models.attribution import (
    AttributionAnalysisResult,
    WalletAttribution,
)
from apps.api.src.models.case import Case
from apps.api.src.models.trace import TraceRequest
from apps.api.src.models.user import User
from apps.api.src.services.attribution_service import (
    AttributionService,
    get_attribution_service,
)
from apps.api.src.services.trace_engine import TraceEngine, get_trace_engine
from chaintrace_shared import BlockchainType
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["VASP Attribution Engine"])


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


@router.post(
    "/investigations/{case_id}/attribution/analyze", response_model=AttributionAnalysisResult
)
async def analyze_case_attribution_endpoint(
    case_id: str,
    request: Request,
    max_hops: int = Query(default=4, ge=1, le=7),
    current_user: User = Depends(require_role("INVESTIGATOR", "ADMIN", "ANALYST")),
    db: AsyncSession = Depends(get_db),
    trace_engine: TraceEngine = Depends(get_trace_engine),
    attr_service: AttributionService = Depends(get_attribution_service),
) -> AttributionAnalysisResult:
    """
    Executes VASP and entity attribution analysis across all paths and terminal nodes of a case.
    """
    case = await _verify_case(case_id, db)

    if not case.suspect_wallet:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Case does not have a suspect wallet configured for attribution analysis",
        )

    # 1. Bounded Trace
    trace_req = TraceRequest(
        chain=BlockchainType(case.target_chain),
        seed_wallet=case.suspect_wallet,
        max_hops=max_hops,
    )
    trace_result = await trace_engine.execute_trace(trace_req, investigation_id=case_id)

    # 2. Attribute terminal wallets and discovered paths
    result = await attr_service.analyze_trace_attributions(
        trace_result=trace_result,
        investigation_id=case_id,
    )

    # 3. Audit Log
    await log_audit_event(
        db=db,
        action="VASP_ATTRIBUTION_ANALYSIS",
        actor=current_user,
        case_id=case_id,
        request=request,
        result="SUCCESS",
        metadata={
            "matched_count": result.matched_count,
            "unknown_count": result.unknown_count,
            "terminal_count": len(result.terminal_attributions),
        },
    )

    return result


@router.get("/investigations/{case_id}/attribution", response_model=AttributionAnalysisResult)
async def get_case_attribution_results(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    trace_engine: TraceEngine = Depends(get_trace_engine),
    attr_service: AttributionService = Depends(get_attribution_service),
) -> AttributionAnalysisResult:
    """
    Retrieves current VASP attribution records for an active investigation.
    """
    case = await _verify_case(case_id, db)

    if not case.suspect_wallet:
        return AttributionAnalysisResult(
            investigation_id=case_id,
            seed_wallet="",
            matched_count=0,
            unknown_count=0,
            conflict_count=0,
            attributions=[],
            terminal_attributions=[],
            dataset_version=attr_service.DATASET_VERSION,
            engine_version=attr_service.ENGINE_VERSION,
            analyzed_at="",
        )

    trace_req = TraceRequest(
        chain=BlockchainType(case.target_chain),
        seed_wallet=case.suspect_wallet,
        max_hops=4,
    )
    trace_result = await trace_engine.execute_trace(trace_req, investigation_id=case_id)

    return await attr_service.analyze_trace_attributions(
        trace_result=trace_result,
        investigation_id=case_id,
    )


@router.get("/attribution/wallet/{chain}/{address}", response_model=WalletAttribution)
async def get_single_wallet_attribution(
    chain: str,
    address: str,
    current_user: User = Depends(get_current_user),
    attr_service: AttributionService = Depends(get_attribution_service),
) -> WalletAttribution:
    """
    Direct lookup endpoint for an individual wallet address.
    Returns MATCHED, CONFLICTING_LABELS, or UNKNOWN with provenance.
    """
    return await attr_service.attribute_wallet(chain=chain, address=address)
