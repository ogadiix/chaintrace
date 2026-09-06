"""
Integration Service
Orchestrates simulated NCRP complaint intake, idempotent case association,
and SAHYOG information requisition lifecycle.
Source of truth: Master Prompt Phase 10 Sections 5, 6, 7, 8, 9, 13, 15, 26
"""

from datetime import UTC, datetime

from apps.api.src.models.case import Case
from apps.api.src.models.integration import (
    NcrpComplaint,
    SahyogRequest,
    SahyogResponse,
)
from apps.api.src.models.user import User
from apps.api.src.schemas.integration import (
    NcrpComplaintCreateSchema,
    SahyogRequestCreateSchema,
)
from apps.api.src.services.integrations.base import NCRPAdapter, SAHYOGAdapter
from apps.api.src.services.integrations.mock_ncrp import MockNCRPAdapter
from apps.api.src.services.integrations.mock_sahyog import MockSAHYOGAdapter
from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class IntegrationService:
    def __init__(
        self,
        ncrp_adapter: NCRPAdapter | None = None,
        sahyog_adapter: SAHYOGAdapter | None = None,
    ) -> None:
        self.ncrp_adapter = ncrp_adapter or MockNCRPAdapter()
        self.sahyog_adapter = sahyog_adapter or MockSAHYOGAdapter()

    async def ingest_ncrp_complaint(
        self,
        db: AsyncSession,
        payload: NcrpComplaintCreateSchema,
        current_user: User,
    ) -> tuple[NcrpComplaint, Case | None, bool]:
        """
        Validates and ingests a simulated NCRP complaint.
        Idempotent: resubmission of existing complaint_id returns the existing case.
        """
        # 1. Idempotency Check
        stmt = select(NcrpComplaint).where(NcrpComplaint.complaint_id == payload.complaint_id)
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing:
            linked_case = None
            if existing.case_id:
                case_stmt = select(Case).where(Case.id == existing.case_id)
                case_res = await db.execute(case_stmt)
                linked_case = case_res.scalar_one_or_none()
            return existing, linked_case, True

        # 2. Syntax & Blockchain Validation
        is_valid, error_msg = self.ncrp_adapter.validate_complaint(payload)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=error_msg or "Complaint validation failed",
            )

        # 3. Automatic Case Generation
        new_case: Case | None = None
        if payload.auto_create_case:
            current_year = datetime.now(UTC).year
            count_stmt = select(func.count(Case.id))
            count_res = await db.execute(count_stmt)
            count_val = (count_res.scalar() or 0) + 1
            case_number = f"CT-{current_year}-{count_val:04d}"

            new_case = Case(
                case_number=case_number,
                complaint_id=payload.complaint_id,
                title=f"NCRP Incident: {payload.category} ({payload.complaint_id})",
                description=payload.description
                or f"Simulated incident ingested from NCRP under category {payload.category}.",
                fraud_category=payload.category,
                reported_amount=payload.reported_amount,
                currency=payload.currency,
                incident_date=datetime.now(UTC).strftime("%Y-%m-%d"),
                target_chain=payload.blockchain.lower(),
                suspect_wallet=payload.wallet_address,
                initial_tx_hash=payload.transaction_hash,
                status="ACTIVE",
                priority="HIGH",
                created_by_id=current_user.id,
                assigned_to_id=current_user.id,
            )
            db.add(new_case)
            await db.commit()
            await db.refresh(new_case)

        # 4. Ingest Complaint Record
        complaint = NcrpComplaint(
            complaint_id=payload.complaint_id,
            source="NCRP_DEMO",
            category=payload.category,
            reported_amount=payload.reported_amount,
            currency=payload.currency,
            blockchain=payload.blockchain.lower(),
            wallet_address=payload.wallet_address,
            transaction_hash=payload.transaction_hash,
            description=payload.description,
            victim_reference=payload.victim_reference,
            status="CASE_CREATED" if new_case else "VALIDATED",
            case_id=new_case.id if new_case else None,
            raw_payload=payload.model_dump(),
        )
        db.add(complaint)
        await db.commit()
        await db.refresh(complaint)

        return complaint, new_case, False

    async def list_ncrp_complaints(self, db: AsyncSession) -> list[NcrpComplaint]:
        stmt = (
            select(NcrpComplaint)
            .options(selectinload(NcrpComplaint.case))
            .order_by(desc(NcrpComplaint.created_at))
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def get_ncrp_complaint_by_id(
        self, db: AsyncSession, complaint_id: str
    ) -> NcrpComplaint | None:
        stmt = (
            select(NcrpComplaint)
            .options(selectinload(NcrpComplaint.case))
            .where(
                (NcrpComplaint.id == complaint_id)
                | (NcrpComplaint.complaint_id == complaint_id)
            )
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def create_sahyog_request(
        self,
        db: AsyncSession,
        case: Case,
        payload: SahyogRequestCreateSchema,
        current_user: User,
    ) -> tuple[SahyogRequest, bool]:
        """
        Drafts a SAHYOG information requisition.
        Enforces idempotency based on (case_id + request_type + target_wallet + authority_reference).
        """
        idempotency_key = (
            f"{case.id}:{payload.request_type}:{payload.target_wallet.strip()}:{payload.authority_reference.strip()}"
        )

        # Check existing request
        stmt = (
            select(SahyogRequest)
            .options(selectinload(SahyogRequest.response))
            .where(SahyogRequest.idempotency_key == idempotency_key)
        )
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing, True

        # Generate sequential request identifier
        count_stmt = select(func.count(SahyogRequest.id)).where(SahyogRequest.case_id == case.id)
        count_res = await db.execute(count_stmt)
        req_count = (count_res.scalar() or 0) + 1
        req_number = f"REQ-SAHYOG-{case.case_number}-{req_count:02d}"

        req_obj = SahyogRequest(
            request_number=req_number,
            case_id=case.id,
            investigation_id=case.id,
            request_type=payload.request_type,
            recipient_entity=payload.recipient_entity,
            target_wallet=payload.target_wallet.strip(),
            transaction_hash=payload.transaction_hash,
            authority_reference=payload.authority_reference,
            requested_information=payload.requested_information,
            status="READY",
            idempotency_key=idempotency_key,
            simulated_scenario=payload.simulated_scenario,
            created_by_id=current_user.id,
        )
        db.add(req_obj)
        await db.commit()

        # Reload with options to ensure response relationship is populated
        stmt_reload = (
            select(SahyogRequest)
            .options(selectinload(SahyogRequest.response))
            .where(SahyogRequest.id == req_obj.id)
        )
        res_reload = await db.execute(stmt_reload)
        return res_reload.scalar_one(), False

    async def submit_sahyog_request(
        self,
        db: AsyncSession,
        request_id: str,
        scenario_override: str | None,
        current_user: User,
    ) -> tuple[SahyogRequest, SahyogResponse, bool]:
        """
        Submits request to mock SAHYOG adapter and attaches the resulting simulated response.
        Idempotent: once submitted and response recorded, returns existing record.
        """
        stmt = (
            select(SahyogRequest)
            .options(selectinload(SahyogRequest.response))
            .where(SahyogRequest.id == request_id)
        )
        res = await db.execute(stmt)
        req_obj = res.scalar_one_or_none()

        if not req_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"SAHYOG request with ID '{request_id}' not found",
            )

        if req_obj.response:
            return req_obj, req_obj.response, True

        # Update to submitted
        req_obj.status = "SUBMITTED"
        req_obj.submitted_at = datetime.now(UTC)
        if scenario_override:
            req_obj.simulated_scenario = scenario_override

        # Execute mock adapter
        response = await self.sahyog_adapter.submit_request(req_obj)
        db.add(response)

        req_obj.status = response.status
        req_obj.completed_at = datetime.now(UTC)

        await db.commit()

        # Reload with response loaded
        stmt_reload = (
            select(SahyogRequest)
            .options(selectinload(SahyogRequest.response))
            .where(SahyogRequest.id == req_obj.id)
        )
        res_reload = await db.execute(stmt_reload)
        req_fresh = res_reload.scalar_one()

        return req_fresh, response, False

    async def list_sahyog_requests(
        self, db: AsyncSession, case_id: str | None = None
    ) -> list[SahyogRequest]:
        stmt = (
            select(SahyogRequest)
            .options(selectinload(SahyogRequest.response))
            .order_by(desc(SahyogRequest.created_at))
        )
        if case_id:
            stmt = stmt.where(SahyogRequest.case_id == case_id)
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def get_sahyog_request_by_id(
        self, db: AsyncSession, request_id: str
    ) -> SahyogRequest | None:
        stmt = (
            select(SahyogRequest)
            .options(selectinload(SahyogRequest.response))
            .where(SahyogRequest.id == request_id)
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()


# Global Dependency
_default_service: IntegrationService | None = None


def get_integration_service() -> IntegrationService:
    global _default_service
    if _default_service is None:
        _default_service = IntegrationService()
    return _default_service
