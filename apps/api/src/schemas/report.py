"""
Pydantic Schemas for Investigation Reports
Defines input payloads, responses, and serialization models.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ReportGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, description="Optional custom report title")
    include_tx_appendix: bool = Field(
        default=True, description="Whether to include full transaction table appendix"
    )
    max_appendix_txs: int = Field(
        default=50, ge=5, le=500, description="Max transactions in appendix table"
    )
    notes: str | None = Field(
        default=None, max_length=1000, description="Optional investigator remarks"
    )
    async_mode: bool = Field(
        default=False, description="Run in background and poll for completion"
    )


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    caseId: str
    investigationId: str
    reportNumber: str
    version: str
    title: str
    filename: str
    fileSizeBytes: int
    sha256Hash: str | None = None
    status: str
    errorMessage: str | None = None
    createdById: str
    createdAt: str
    completedAt: str | None = None
    downloadUrl: str
    previewUrl: str
    summarySnapshot: dict[str, Any] = Field(default_factory=dict)


class ReportListResponse(BaseModel):
    reports: list[ReportResponse]
    total: int
