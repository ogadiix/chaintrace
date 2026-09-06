"""
Case & Complaint Metadata SQLAlchemy Model
"""
import uuid
from datetime import UTC, datetime

from apps.api.src.core.database import Base
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    fraud_category: Mapped[str] = mapped_column(String(50), nullable=False, default="OTHER")
    reported_amount: Mapped[str] = mapped_column(String(50), nullable=False, default="0")
    currency: Mapped[str] = mapped_column(String(20), nullable=False, default="USD")
    incident_date: Mapped[str] = mapped_column(String(50), nullable=False)
    target_chain: Mapped[str] = mapped_column(String(50), nullable=False)
    suspect_wallet: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    initial_tx_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="ACTIVE")
    priority: Mapped[str] = mapped_column(String(50), nullable=False, default="MEDIUM")
    
    assigned_to_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(UTC), 
        onupdate=lambda: datetime.now(UTC), 
        nullable=False
    )

    created_by = relationship("User", back_populates="created_cases", foreign_keys=[created_by_id])
    assigned_to = relationship("User", back_populates="assigned_cases", foreign_keys=[assigned_to_id])
    audit_logs = relationship("AuditLog", back_populates="case", cascade="all, delete-orphan")
