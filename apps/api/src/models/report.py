"""
Investigation Report SQLAlchemy Model
Stores metadata, versioning, cryptographic hashes, and storage paths of generated PDF dossiers.
Source of truth: Master Prompt Phase 9 Sections 2, 21, 22, 25, 27
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from apps.api.src.core.database import Base
from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    investigation_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    report_number: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sha256_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="QUEUED"
    )  # QUEUED, GENERATING, COMPLETED, FAILED
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    parameters: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    summary_snapshot: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict
    )

    # Relationships
    case = relationship("Case", backref="reports")
    created_by = relationship("User", foreign_keys=[created_by_id])
