"""
Case Management REST Endpoints
Implements US-01 through US-03 foundation (create, list, retrieve, update cases).
"""

from datetime import UTC, datetime

from apps.api.src.core.audit import log_audit_event
from apps.api.src.core.database import get_db
from apps.api.src.core.security import get_current_user, require_role
from apps.api.src.models.case import Case
from apps.api.src.models.user import User
from apps.api.src.schemas.case import (
    CaseListResponse,
    CaseResponse,
    CreateCaseSchema,
    UpdateCaseSchema,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/cases", tags=["Case Management"])


def serialize_case(case: Case) -> CaseResponse:
    return CaseResponse(
        id=case.id,
        caseNumber=case.case_number,
        complaintId=case.complaint_id,
        title=case.title,
        description=case.description,
        fraudCategory=case.fraud_category,
        reportedAmount=case.reported_amount,
        currency=case.currency,
        incidentDate=case.incident_date,
        targetChain=case.target_chain,
        suspectWallet=case.suspect_wallet,
        initialTxHash=case.initial_tx_hash,
        status=case.status,
        priority=case.priority,
        assignedToId=case.assigned_to_id,
        createdById=case.created_by_id,
        createdAt=case.created_at.isoformat(),
        updatedAt=case.updated_at.isoformat(),
    )


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    payload: CreateCaseSchema,
    request: Request,
    current_user: User = Depends(require_role("INVESTIGATOR", "ADMIN", "ANALYST")),
    db: AsyncSession = Depends(get_db),
):
    # Generate sequential case number: CT-YYYY-XXXX
    current_year = datetime.now(UTC).year
    count_stmt = select(func.count(Case.id))
    count_result = await db.execute(count_stmt)
    current_count = (count_result.scalar() or 0) + 1
    case_number = f"CT-{current_year}-{current_count:04d}"

    new_case = Case(
        case_number=case_number,
        complaint_id=payload.complaintId,
        title=payload.title,
        description=payload.description,
        fraud_category=payload.fraudCategory,
        reported_amount=payload.reportedAmount,
        currency=payload.currency,
        incident_date=payload.incidentDate,
        target_chain=payload.targetChain.value,
        suspect_wallet=payload.suspectWallet,
        initial_tx_hash=payload.initialTxHash,
        status="ACTIVE",
        priority=payload.priority.value,
        created_by_id=current_user.id,
        assigned_to_id=current_user.id,
    )
    db.add(new_case)
    await db.commit()
    await db.refresh(new_case)

    # Immutable audit log
    await log_audit_event(
        db=db,
        action="CASE_CREATED",
        actor=current_user,
        case_id=new_case.id,
        request=request,
        result="SUCCESS",
        metadata={
            "case_number": new_case.case_number,
            "target_chain": new_case.target_chain,
            "suspect_wallet": new_case.suspect_wallet,
        },
    )

    return serialize_case(new_case)


@router.get("", response_model=CaseListResponse)
async def list_cases(
    status_filter: str | None = Query(default=None, alias="status"),
    chain_filter: str | None = Query(default=None, alias="chain"),
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Case)

    if status_filter:
        stmt = stmt.where(Case.status == status_filter.upper())
    if chain_filter:
        stmt = stmt.where(Case.target_chain == chain_filter.lower())
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            (Case.case_number.ilike(pattern))
            | (Case.complaint_id.ilike(pattern))
            | (Case.title.ilike(pattern))
            | (Case.suspect_wallet.ilike(pattern))
        )

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_count = (await db.execute(count_stmt)).scalar() or 0

    # Paginated results
    stmt = stmt.order_by(desc(Case.created_at)).limit(limit).offset(offset)
    result = await db.execute(stmt)
    cases = result.scalars().all()

    return CaseListResponse(
        cases=[serialize_case(c) for c in cases],
        total=total_count,
    )


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Case).where(Case.id == case_id)
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID '{case_id}' not found",
        )

    await log_audit_event(
        db=db,
        action="CASE_VIEWED",
        actor=current_user,
        case_id=case.id,
        request=request,
        result="SUCCESS",
    )

    return serialize_case(case)


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    payload: UpdateCaseSchema,
    request: Request,
    current_user: User = Depends(require_role("INVESTIGATOR", "ADMIN", "ANALYST")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Case).where(Case.id == case_id)
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID '{case_id}' not found",
        )

    updated_fields = {}
    if payload.title is not None:
        case.title = payload.title
        updated_fields["title"] = payload.title
    if payload.complaintId is not None:
        case.complaint_id = payload.complaintId
        updated_fields["complaint_id"] = payload.complaintId
    if payload.description is not None:
        case.description = payload.description
        updated_fields["description"] = payload.description
    if payload.status is not None:
        case.status = payload.status.value
        updated_fields["status"] = payload.status.value
    if payload.priority is not None:
        case.priority = payload.priority.value
        updated_fields["priority"] = payload.priority.value
    if payload.assignedToId is not None:
        case.assigned_to_id = payload.assignedToId
        updated_fields["assigned_to_id"] = payload.assignedToId

    case.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(case)

    await log_audit_event(
        db=db,
        action="CASE_UPDATED",
        actor=current_user,
        case_id=case.id,
        request=request,
        result="SUCCESS",
        metadata=updated_fields,
    )

    return serialize_case(case)
