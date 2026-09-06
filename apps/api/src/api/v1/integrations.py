"""
NCRP and SAHYOG Integrations REST API Endpoints
Provides simulated complaint intake from NCRP, automatic case generation,
and I4C SAHYOG VASP information/freeze requisition coordination.
Source of truth: Master Prompt Phase 10 Sections 5, 8, 9, 10, 11, 14, 15, 25
"""

from typing import Any

from apps.api.src.core.audit import log_audit_event
from apps.api.src.core.authorization import verify_case_access
from apps.api.src.core.database import get_db
from apps.api.src.core.security import get_current_user, require_role
from apps.api.src.models.case import Case
from apps.api.src.models.integration import (
    NcrpComplaint,
    SahyogRequest,
    SahyogResponse,
)
from apps.api.src.models.user import User
from apps.api.src.schemas.integration import (
    ALLOWED_SCENARIOS,
    NcrpComplaintCreateSchema,
    NcrpComplaintListResponse,
    NcrpComplaintResponse,
    SahyogRequestCreateSchema,
    SahyogRequestListResponse,
    SahyogRequestResponse,
    SahyogResponseModel,
)
from apps.api.src.services.integrations import (
    IntegrationService,
    get_integration_service,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["NCRP & SAHYOG Integrations"])


def serialize_complaint(c: NcrpComplaint) -> NcrpComplaintResponse:
    case_num = c.case.case_number if c.case else None
    return NcrpComplaintResponse(
        id=c.id,
        complaintId=c.complaint_id,
        source=c.source,
        category=c.category,
        reportedAmount=c.reported_amount,
        currency=c.currency,
        blockchain=c.blockchain,
        walletAddress=c.wallet_address,
        transactionHash=c.transaction_hash,
        description=c.description,
        victimReference=c.victim_reference,
        status=c.status,
        caseId=c.case_id,
        caseNumber=case_num,
        createdAt=c.created_at.isoformat(),
        disclaimer="SIMULATED NCRP INTEGRATION — HACKATHON DEMO ONLY",
    )


def serialize_sahyog_response(r: SahyogResponse) -> SahyogResponseModel:
    return SahyogResponseModel(
        id=r.id,
        requestId=r.request_id,
        caseId=r.case_id,
        status=r.status,
        source=r.source,
        recipientEntity=r.recipient_entity,
        accountDetails=r.account_details or {},
        transactions=r.transactions or [],
        evidenceId=r.evidence_id,
        disclaimer=r.disclaimer,
        receivedAt=r.received_at.isoformat(),
    )


def serialize_sahyog_request(req: SahyogRequest) -> SahyogRequestResponse:
    resp_model = serialize_sahyog_response(req.response) if req.response else None
    return SahyogRequestResponse(
        id=req.id,
        requestNumber=req.request_number,
        caseId=req.case_id,
        investigationId=req.investigation_id,
        requestType=req.request_type,
        recipientEntity=req.recipient_entity,
        targetWallet=req.target_wallet,
        transactionHash=req.transaction_hash,
        authorityReference=req.authority_reference,
        requestedInformation=req.requested_information,
        status=req.status,
        simulatedScenario=req.simulated_scenario,
        createdById=req.created_by_id,
        createdAt=req.created_at.isoformat(),
        submittedAt=req.submitted_at.isoformat() if req.submitted_at else None,
        completedAt=req.completed_at.isoformat() if req.completed_at else None,
        response=resp_model,
        disclaimer="SIMULATED SAHYOG COORDINATION — HACKATHON DEMO ONLY",
    )
# =============================================================================


@router.post(
    "/integrations/ncrp/complaints",
    response_model=NcrpComplaintResponse,
    status_code=status.HTTP_201_CREATED,
)
async def ingest_ncrp_complaint_endpoint(
    payload: NcrpComplaintCreateSchema,
    request: Request,
    current_user: User = Depends(require_role("INVESTIGATOR", "ADMIN", "ANALYST")),
    db: AsyncSession = Depends(get_db),
    integration_service: IntegrationService = Depends(get_integration_service),
) -> NcrpComplaintResponse:
    """
    Ingests a simulated complaint from NCRP. Automatically establishes a ChainTrace case.
    Idempotent: resubmitting identical complaint_id returns existing case record.
    """
    complaint, new_case, is_duplicate = await integration_service.ingest_ncrp_complaint(
        db=db,
        payload=payload,
        current_user=current_user,
    )

    if not is_duplicate and new_case:
        await log_audit_event(
            db=db,
            action="NCRP_COMPLAINT_INGESTED",
            actor=current_user,
            case_id=new_case.id,
            request=request,
            result="SUCCESS",
            metadata={
                "complaint_id": complaint.complaint_id,
                "case_number": new_case.case_number,
                "wallet": complaint.wallet_address,
                "chain": complaint.blockchain,
            },
        )

    # Attach loaded case relationship for response serialization
    complaint.case = new_case
    return serialize_complaint(complaint)


@router.get("/integrations/ncrp/complaints", response_model=NcrpComplaintListResponse)
async def list_ncrp_complaints_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    integration_service: IntegrationService = Depends(get_integration_service),
) -> NcrpComplaintListResponse:
    """Lists all ingested simulated NCRP complaints."""
    complaints = await integration_service.list_ncrp_complaints(db)
    return NcrpComplaintListResponse(
        complaints=[serialize_complaint(c) for c in complaints],
        total=len(complaints),
    )


@router.get("/integrations/ncrp/complaints/samples")
async def get_sample_ncrp_complaints(
    current_user: User = Depends(get_current_user),
    integration_service: IntegrationService = Depends(get_integration_service),
) -> list[dict[str, Any]]:
    """Returns deterministic pre-configured demo complaints for instant hackathon ingestion."""
    return integration_service.ncrp_adapter.get_sample_complaints()


@router.get(
    "/integrations/ncrp/complaints/{complaint_id}",
    response_model=NcrpComplaintResponse,
)
async def get_ncrp_complaint_endpoint(
    complaint_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    integration_service: IntegrationService = Depends(get_integration_service),
) -> NcrpComplaintResponse:
    """Fetches complaint metadata by ID or reference code."""
    complaint = await integration_service.get_ncrp_complaint_by_id(db, complaint_id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"NCRP Complaint '{complaint_id}' not found",
        )
    return serialize_complaint(complaint)


# =============================================================================
# SAHYOG Endpoints
# =============================================================================


@router.post(
    "/investigations/{case_id}/sahyog/requests",
    response_model=SahyogRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_sahyog_request_endpoint(
    case_id: str,
    payload: SahyogRequestCreateSchema,
    request: Request,
    current_user: User = Depends(require_role("INVESTIGATOR", "ADMIN", "ANALYST")),
    db: AsyncSession = Depends(get_db),
    integration_service: IntegrationService = Depends(get_integration_service),
) -> SahyogRequestResponse:
    """
    Drafts an information or freeze request for an attributed VASP wallet.
    Idempotent: prevents duplicate drafts for identical wallet + authority query.
    """
    case = await verify_case_access(case_id, current_user, db, require_write=True)

    req_obj, is_duplicate = await integration_service.create_sahyog_request(
        db=db,
        case=case,
        payload=payload,
        current_user=current_user,
    )

    if not is_duplicate:
        await log_audit_event(
            db=db,
            action="SAHYOG_REQUEST_DRAFTED",
            actor=current_user,
            case_id=case.id,
            request=request,
            result="SUCCESS",
            metadata={
                "request_number": req_obj.request_number,
                "request_type": req_obj.request_type,
                "recipient": req_obj.recipient_entity,
                "target_wallet": req_obj.target_wallet,
            },
        )

    return serialize_sahyog_request(req_obj)


@router.get(
    "/investigations/{case_id}/sahyog/requests",
    response_model=SahyogRequestListResponse,
)
async def list_investigation_sahyog_requests(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    integration_service: IntegrationService = Depends(get_integration_service),
) -> SahyogRequestListResponse:
    """Lists all SAHYOG requests associated with an investigation case."""
    await verify_case_access(case_id, current_user, db)
    requests = await integration_service.list_sahyog_requests(db, case_id=case_id)
    return SahyogRequestListResponse(
        requests=[serialize_sahyog_request(r) for r in requests],
        total=len(requests),
    )


@router.get("/sahyog/requests", response_model=SahyogRequestListResponse)
async def list_all_sahyog_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    integration_service: IntegrationService = Depends(get_integration_service),
) -> SahyogRequestListResponse:
    """Lists all SAHYOG requests across all cases."""
    requests = await integration_service.list_sahyog_requests(db, case_id=None)
    return SahyogRequestListResponse(
        requests=[serialize_sahyog_request(r) for r in requests],
        total=len(requests),
    )


@router.get("/sahyog/requests/{request_id}", response_model=SahyogRequestResponse)
async def get_sahyog_request_endpoint(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    integration_service: IntegrationService = Depends(get_integration_service),
) -> SahyogRequestResponse:
    """Retrieves request details, review state, and attached response."""
    req_obj = await integration_service.get_sahyog_request_by_id(db, request_id)
    if not req_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found",
        )
    await verify_case_access(req_obj.case_id, current_user, db)
    return serialize_sahyog_request(req_obj)


@router.post(
    "/sahyog/requests/{request_id}/submit",
    response_model=SahyogRequestResponse,
)
async def submit_sahyog_request_endpoint(
    request_id: str,
    request: Request,
    scenario: str | None = Query(
        default=None,
        description="Override scenario: SUCCESS, NO_MATCH, PROCESSING, REQUEST_FAILED, FREEZE_REQUEST_DEMO",
    ),
    current_user: User = Depends(require_role("INVESTIGATOR", "ADMIN")),
    db: AsyncSession = Depends(get_db),
    integration_service: IntegrationService = Depends(get_integration_service),
) -> SahyogRequestResponse:
    """
    Submits requisition to the simulated VASP coordination desk.
    Returns deterministic synthetic response and attaches evidentiary item.
    """
    if scenario and scenario not in ALLOWED_SCENARIOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid scenario '{scenario}'. Allowed: {sorted(ALLOWED_SCENARIOS)}",
        )

    req_check = await integration_service.get_sahyog_request_by_id(db, request_id)
    if not req_check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found",
        )
    await verify_case_access(req_check.case_id, current_user, db, require_write=True)

    req_obj, response, is_duplicate = await integration_service.submit_sahyog_request(
        db=db,
        request_id=request_id,
        scenario_override=scenario,
        current_user=current_user,
    )

    if not is_duplicate:
        await log_audit_event(
            db=db,
            action="SAHYOG_REQUEST_SUBMITTED",
            actor=current_user,
            case_id=req_obj.case_id,
            request=request,
            result="SUCCESS",
            metadata={
                "request_number": req_obj.request_number,
                "status": req_obj.status,
                "scenario": req_obj.simulated_scenario,
                "evidence_id": response.evidence_id,
            },
        )

    req_obj.response = response
    return serialize_sahyog_request(req_obj)


@router.get("/sahyog/requests/{request_id}/response", response_model=SahyogResponseModel)
async def get_sahyog_response_endpoint(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    integration_service: IntegrationService = Depends(get_integration_service),
) -> SahyogResponseModel:
    """Fetches the simulated response and KYC/transaction details for a request."""
    req_obj = await integration_service.get_sahyog_request_by_id(db, request_id)
    if not req_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found",
        )
    await verify_case_access(req_obj.case_id, current_user, db)
    if not req_obj.response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No response has been received for this request yet. Submit request first.",
        )
    return serialize_sahyog_response(req_obj.response)
