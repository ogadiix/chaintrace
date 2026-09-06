"""
Audit Log Inspection Endpoints
"""
import json

from apps.api.src.core.database import get_db
from apps.api.src.core.security import get_current_user
from apps.api.src.models.audit import AuditLog
from apps.api.src.models.user import User
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/audit", tags=["Audit Logs"])


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    actorId: str | None
    actorEmail: str | None
    action: str
    caseId: str | None
    timestamp: str
    sourceIp: str | None
    result: str
    metadata: dict | None


class AuditLogListResponse(BaseModel):
    logs: list[AuditLogResponse]
    total: int


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    case_id: str | None = Query(default=None),
    action: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AuditLog)
    if case_id:
        stmt = stmt.where(AuditLog.case_id == case_id)
    if action:
        stmt = stmt.where(AuditLog.action == action.upper())

    stmt = stmt.order_by(desc(AuditLog.timestamp)).limit(limit)
    result = await db.execute(stmt)
    records = result.scalars().all()

    items = []
    for r in records:
        meta = None
        if r.metadata_json:
            try:
                meta = json.loads(r.metadata_json)
            except Exception:
                meta = {"raw": r.metadata_json}

        items.append(
            AuditLogResponse(
                id=r.id,
                actorId=r.actor_id,
                actorEmail=r.actor_email,
                action=r.action,
                caseId=r.case_id,
                timestamp=r.timestamp.isoformat(),
                sourceIp=r.source_ip,
                result=r.result,
                metadata=meta,
            )
        )

    return AuditLogListResponse(logs=items, total=len(items))
