"""
Investigation Reports REST API Endpoints
Provides authenticated PDF report generation, listing, metadata retrieval,
and secure cryptographic download streaming.
Source of truth: Master Prompt Phase 9 Sections 23, 26, 27, 28
"""

import os

from apps.api.src.core.audit import log_audit_event
from apps.api.src.core.authorization import verify_case_access, verify_report_access
from apps.api.src.core.config import settings
from apps.api.src.core.database import get_db
from apps.api.src.core.rate_limiter import get_rate_limiter, rate_limit_key_from_request
from apps.api.src.core.security import get_current_user, require_role
from apps.api.src.models.case import Case
from apps.api.src.models.report import Report
from apps.api.src.models.user import User
from apps.api.src.schemas.report import (
    ReportGenerateRequest,
    ReportListResponse,
    ReportResponse,
)
from apps.api.src.services.report_service import ReportService, get_report_service
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["Investigation Reports Engine"])


def serialize_report(report: Report) -> ReportResponse:
    return ReportResponse(
        id=report.id,
        caseId=report.case_id,
        investigationId=report.investigation_id,
        reportNumber=report.report_number,
        version=report.version,
        title=report.title,
        filename=report.filename,
        fileSizeBytes=report.file_size_bytes,
        sha256Hash=report.sha256_hash,
        status=report.status,
        errorMessage=report.error_message,
        createdById=report.created_by_id,
        createdAt=report.created_at.isoformat(),
        completedAt=report.completed_at.isoformat() if report.completed_at else None,
        downloadUrl=f"/api/v1/reports/{report.id}/download",
        previewUrl=f"/api/v1/reports/{report.id}/preview",
        summarySnapshot=report.summary_snapshot or {},
    )


@router.post(
    "/investigations/{case_id}/reports",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_case_report(
    case_id: str,
    payload: ReportGenerateRequest,
    request: Request,
    current_user: User = Depends(require_role("INVESTIGATOR", "ADMIN", "ANALYST")),
    db: AsyncSession = Depends(get_db),
    report_service: ReportService = Depends(get_report_service),
) -> ReportResponse:
    """
    Compiles investigative evidence and generates a court-admissible PDF dossier.
    """
    case = await verify_case_access(case_id, current_user, db, require_write=True)

    # Rate limit report generation
    limiter = get_rate_limiter()
    rate_key = rate_limit_key_from_request(request, user_id=current_user.id)
    limiter.enforce(
        key=f"report:{rate_key}",
        max_requests=settings.RATE_LIMIT_REPORT_PER_MINUTE,
        window_seconds=60.0,
        category="report generation",
    )

    report_record = await report_service.create_report(
        db=db,
        case=case,
        current_user=current_user,
        payload=payload,
    )

    await log_audit_event(
        db=db,
        action="REPORT_GENERATED",
        actor=current_user,
        case_id=case.id,
        request=request,
        result="SUCCESS",
        metadata={
            "report_id": report_record.id,
            "report_number": report_record.report_number,
            "version": report_record.version,
            "sha256_hash": report_record.sha256_hash,
        },
    )

    return serialize_report(report_record)


@router.get("/investigations/{case_id}/reports", response_model=ReportListResponse)
async def list_case_reports(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    report_service: ReportService = Depends(get_report_service),
) -> ReportListResponse:
    """
    Lists all generated investigation reports for a given case.
    """
    await verify_case_access(case_id, current_user, db)
    reports = await report_service.list_reports(db, case_id=case_id, user=current_user)
    return ReportListResponse(
        reports=[serialize_report(r) for r in reports],
        total=len(reports),
    )


@router.get("/reports", response_model=ReportListResponse)
async def list_all_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    report_service: ReportService = Depends(get_report_service),
) -> ReportListResponse:
    """
    Lists all reports across all investigations accessible to the current user.
    """
    reports = await report_service.list_reports(db, case_id=None, user=current_user)
    return ReportListResponse(
        reports=[serialize_report(r) for r in reports],
        total=len(reports),
    )


@router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report_metadata(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    report_service: ReportService = Depends(get_report_service),
) -> ReportResponse:
    """
    Retrieves metadata, status, and cryptographic verification hash for a report.
    """
    report = await verify_report_access(report_id, current_user, db)
    return serialize_report(report)


@router.get("/reports/{report_id}/download")
async def download_report_file(
    report_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    report_service: ReportService = Depends(get_report_service),
) -> FileResponse:
    """
    Streams the authenticated PDF dossier for download as an attachment.
    """
    report = await verify_report_access(report_id, current_user, db)

    # Validate file path security
    abs_storage = os.path.abspath(report.storage_path)
    allowed_base = os.path.abspath(settings.REPORTS_DIR)
    if not abs_storage.startswith(allowed_base) or not os.path.exists(abs_storage):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report artifact file not found on storage",
        )

    # Log audit event
    await log_audit_event(
        db=db,
        action="REPORT_DOWNLOADED",
        actor=current_user,
        case_id=report.case_id,
        request=request,
        result="SUCCESS",
        metadata={
            "report_id": report.id,
            "filename": report.filename,
            "sha256": report.sha256_hash,
        },
    )

    headers = {
        "X-Report-SHA256": report.sha256_hash or "",
        "X-Report-Version": report.version,
    }

    return FileResponse(
        path=abs_storage,
        media_type="application/pdf",
        filename=report.filename,
        headers=headers,
    )


@router.get("/reports/{report_id}/preview")
async def preview_report_file(
    report_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    report_service: ReportService = Depends(get_report_service),
) -> FileResponse:
    """
    Streams the authenticated PDF dossier inline for browser rendering.
    """
    report = await verify_report_access(report_id, current_user, db)

    abs_storage = os.path.abspath(report.storage_path)
    allowed_base = os.path.abspath(settings.REPORTS_DIR)
    if not abs_storage.startswith(allowed_base) or not os.path.exists(abs_storage):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report artifact file not found on storage",
        )

    await log_audit_event(
        db=db,
        action="REPORT_PREVIEWED",
        actor=current_user,
        case_id=report.case_id,
        request=request,
        result="SUCCESS",
        metadata={"report_id": report.id},
    )

    return FileResponse(
        path=abs_storage,
        media_type="application/pdf",
        content_disposition_type="inline",
    )
