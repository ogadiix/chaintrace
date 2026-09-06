"""
NCRP and SAHYOG Integration SQLAlchemy Models
Stores simulated complaint metadata, VASP information requests, and mock responses.
Source of truth: Master Prompt Phase 10 Sections 2, 5, 6, 7, 9, 10, 14, 15
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from apps.api.src.core.database import Base
from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class NcrpComplaint(Base):
    """
    Stores simulated cybercrime complaints ingested from NCRP.
    Clearly marked as SIMULATED for hackathon demonstration.
    """

    __tablename__ = "ncrp_complaints"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    complaint_id: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="NCRP_DEMO")
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, default="CRYPTO_FRAUD"
    )
    reported_amount: Mapped[str] = mapped_column(
        String(50), nullable=False, default="0"
    )
    currency: Mapped[str] = mapped_column(String(20), nullable=False, default="INR")
    blockchain: Mapped[str] = mapped_column(String(50), nullable=False)
    wallet_address: Mapped[str] = mapped_column(
        String(255), index=True, nullable=False
    )
    transaction_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    victim_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)

    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="RECEIVED"
    )  # RECEIVED, VALIDATED, CASE_CREATED, UNDER_INVESTIGATION, CLOSED

    case_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="SET NULL"), nullable=True, index=True
    )

    raw_payload: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    case = relationship("Case", backref="ncrp_complaints")


class SahyogRequest(Base):
    """
    Represents an information or freeze requisition prepared for a VASP via the I4C SAHYOG workflow.
    Simulated workflow for demonstration.
    """

    __tablename__ = "sahyog_requests"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    request_number: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    investigation_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)

    request_type: Mapped[str] = mapped_column(
        String(60), nullable=False, default="ACCOUNT_IDENTIFICATION"
    )  # ACCOUNT_IDENTIFICATION, TRANSACTION_INFORMATION, KYC_INFORMATION, ACCOUNT_ACTIVITY, FREEZE_REQUEST_DEMO

    recipient_entity: Mapped[str] = mapped_column(String(120), nullable=False)
    target_wallet: Mapped[str] = mapped_column(String(255), nullable=False)
    transaction_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    authority_reference: Mapped[str] = mapped_column(
        String(100), nullable=False, default="SEC-91-CrPC-DEMO"
    )
    requested_information: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="DRAFT"
    )  # DRAFT, READY, SUBMITTED, PROCESSING, RESPONSE_RECEIVED, FAILED, CANCELLED

    idempotency_key: Mapped[str] = mapped_column(
        String(128), unique=True, index=True, nullable=False
    )
    simulated_scenario: Mapped[str] = mapped_column(
        String(50), nullable=False, default="SUCCESS"
    )  # SUCCESS, NO_MATCH, PROCESSING, REQUEST_FAILED, FREEZE_REQUEST_DEMO

    created_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    case = relationship("Case", backref="sahyog_requests")
    created_by = relationship("User", foreign_keys=[created_by_id])
    response = relationship(
        "SahyogResponse",
        back_populates="request",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class SahyogResponse(Base):
    """
    Stores simulated intermediary/VASP response and links it as evidence to the investigation.
    """

    __tablename__ = "sahyog_responses"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    request_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sahyog_requests.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    case_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="RESPONSE_RECEIVED"
    )  # RESPONSE_RECEIVED, NO_MATCH, FAILED
    source: Mapped[str] = mapped_column(
        String(50), nullable=False, default="SAHYOG_DEMO"
    )
    recipient_entity: Mapped[str] = mapped_column(String(120), nullable=False)

    account_details: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    transactions: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    evidence_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    disclaimer: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="SIMULATED RESPONSE — FOR DEMONSTRATION PURPOSES ONLY",
    )

    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    request = relationship("SahyogRequest", back_populates="response")
