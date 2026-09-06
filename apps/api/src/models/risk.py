"""
Risk Engine Models & Schemas
Defines risk assessments, explainable contributions, score caps, and historical audit states.
Source of truth: Master Prompt Phase 7 Sections 2, 3, 6, 7, 10, 15, 18, 20
"""

from typing import Any

from chaintrace_shared import RiskLevel
from pydantic import BaseModel, ConfigDict, Field


class RiskSignalContribution(BaseModel):
    """An explainable scoring contribution linking a specific signal to underlying evidence."""

    model_config = ConfigDict(from_attributes=True)

    signal: str = Field(
        ..., description="Signal identifier e.g. 'RAPID_FORWARDING', 'SANCTIONED_ENTITY'"
    )
    category: str = Field(
        ..., description="Category group e.g. 'STRUCTURAL_VELOCITY', 'KNOWN_ENTITY'"
    )
    raw_weight: int = Field(..., description="Nominal weight before grouping caps")
    effective_weight: int = Field(
        ..., description="Net effective score points applied after anti-double-counting"
    )
    weight: int = Field(default=0, description="Effective score weight")
    reason: str = Field(..., description="Human-readable explanation of why this signal fired")
    source: str = Field(default="INTELLIGENCE_ENGINE", description="Signal provenance source")
    evidence_refs: list[dict[str, Any]] = Field(
        default_factory=list, description="Direct blockchain evidence links"
    )
    metadata: dict[str, Any] = Field(default_factory=dict)


class ManualRiskOverride(BaseModel):
    """Investigator-initiated manual risk classification override."""

    model_config = ConfigDict(from_attributes=True)

    overridden_by: str = Field(..., description="User ID of the investigator")
    overridden_at: str = Field(..., description="Timestamp of the override")
    original_level: RiskLevel
    override_level: RiskLevel
    reason: str = Field(..., description="Justification documented by the investigator")


class RiskAssessment(BaseModel):
    """
    Structured investigation risk assessment.
    Represents analytical prioritization signals, never legal conclusions of guilt.
    """

    model_config = ConfigDict(from_attributes=True)

    assessment_id: str
    investigation_id: str
    seed_wallet: str
    score: int = Field(..., ge=0, le=100, description="Bounded composite risk score [0-100]")
    risk_level: RiskLevel
    contributions: list[RiskSignalContribution] = Field(default_factory=list)
    reasons: list[str] = Field(
        default_factory=list, description="Top human-readable summary bullets"
    )
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    evidence_refs: list[dict[str, Any]] = Field(
        default_factory=list, description="Consolidated evidence references"
    )
    manual_override: ManualRiskOverride | None = None
    engine_version: str = "1.0.0"
    intelligence_engine_version: str = "1.0.0"
    attribution_dataset_version: str = "vasp_labels_v1"
    created_at: str
    updated_at: str


class RiskOverrideRequest(BaseModel):
    """Payload for submitting an investigator manual risk override."""

    model_config = ConfigDict(from_attributes=True)

    override_level: RiskLevel
    reason: str = Field(..., min_length=5, description="Required justification for the override")
