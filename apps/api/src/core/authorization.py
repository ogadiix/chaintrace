"""
Centralized Object-Level Authorization (IDOR/BOLA Protection)
Ensures that users can only access resources they own or are assigned to,
preventing Insecure Direct Object Reference attacks.
"""

from apps.api.src.core.database import get_db
from apps.api.src.models.case import Case
from apps.api.src.models.report import Report
from apps.api.src.models.user import User
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def verify_case_access(
    case_id: str,
    user: User,
    db: AsyncSession,
    *,
    require_write: bool = False,
) -> Case:
    """
    Verifies the authenticated user has access to the specified case.

    Authorization rules:
    - ADMIN: full access to all cases.
    - INVESTIGATOR/ANALYST: access to cases they created or are assigned to.
    - VIEWER: read-only access to cases they are assigned to.

    Raises HTTP 404 (not 403) to prevent enumeration of case IDs.
    """
    stmt = select(Case).where(Case.id == case_id)
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found",
        )

    # ADMIN bypasses ownership check
    if user.role == "ADMIN":
        return case

    # VIEWER can only read, never write
    if user.role == "VIEWER" and require_write:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found",
        )

    # Check ownership: created by or assigned to the current user
    is_owner = case.created_by_id == user.id
    is_assigned = case.assigned_to_id == user.id

    if not is_owner and not is_assigned:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found",
        )

    return case


async def verify_report_access(
    report_id: str,
    user: User,
    db: AsyncSession,
) -> Report:
    """
    Verifies report access by joining through the parent case ownership.
    """
    stmt = select(Report).where(Report.id == report_id)
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found",
        )

    # Verify the user has access to the parent case
    await verify_case_access(report.case_id, user, db)
    return report
