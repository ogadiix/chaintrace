"""
Audit Logging Service Helper
"""

import json
from typing import Any

from apps.api.src.models.audit import AuditLog
from apps.api.src.models.user import User
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession


async def log_audit_event(
    db: AsyncSession,
    action: str,
    actor: User | None = None,
    case_id: str | None = None,
    request: Request | None = None,
    result: str = "SUCCESS",
    metadata: dict[str, Any] | None = None,
) -> AuditLog:
    source_ip = None
    if request and request.client:
        source_ip = request.client.host

    log_entry = AuditLog(
        actor_id=actor.id if actor else None,
        actor_email=actor.email if actor else None,
        action=action,
        case_id=case_id,
        source_ip=source_ip,
        result=result,
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)
    return log_entry
