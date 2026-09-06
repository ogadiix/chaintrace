"""
Intelligence Engine Models & Schemas
Defines structured findings, evidence references, extracted features, and rule results.
Source of truth: Master Prompt Phase 5 Sections 2, 3, 14, 15, 18
"""
from typing import Any

from chaintrace_shared import FindingSeverity, FindingType
from pydantic import BaseModel, ConfigDict, Field


class EvidenceReference(BaseModel):
    """Immutable forensic evidence linking a finding to specific blockchain artifacts."""
    model_config = ConfigDict(from_attributes=True)

    type: str = Field(..., description="'TRANSACTION', 'WALLET', 'PATH', or 'GRAPH_EDGE'")
    ref_id: str = Field(..., description="Unique transaction hash, wallet address, or path ID")
    description: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class IntelligenceFinding(BaseModel):
    """
    Structured intelligence finding.
    Strictly enforces separation between observed facts and investigative interpretation.
    """
    model_config = ConfigDict(from_attributes=True)

    finding_id: str
    investigation_id: str | None = None
    type: FindingType
    severity: FindingSeverity
    title: str = Field(..., description="Brief headline of the discovered pattern")
    description: str = Field(..., description="Detailed explanation of the pattern")
    observed_fact: str = Field(..., description="Objective, verifiable blockchain facts (e.g., amounts, timestamps)")
    interpretation: str = Field(..., description="Forensic interpretation without asserting legal guilt")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence that the observed pattern matches rule definition")
    evidence_refs: list[EvidenceReference] = Field(default_factory=list, description="Direct references to transactions and wallets")
    rule_id: str = Field(..., description="Identifier of the rule that generated this finding")
    rule_version: str = Field(..., description="Version of the rule for audit reproducibility")
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class WalletFeatures(BaseModel):
    """Extracted behavioral and statistical features for a wallet address."""
    model_config = ConfigDict(from_attributes=True)

    wallet_address: str
    chain: str
    incoming_tx_count: int = 0
    outgoing_tx_count: int = 0
    total_tx_count: int = 0
    total_incoming_amount: str = "0"
    total_outgoing_amount: str = "0"
    unique_sources: list[str] = Field(default_factory=list)
    unique_destinations: list[str] = Field(default_factory=list)
    fan_in: int = 0
    fan_out: int = 0
    min_transfer_interval_sec: float | None = None
    avg_transfer_interval_sec: float | None = None
    round_amount_ratio: float = 0.0
    transactions_per_hour_peak: float = 0.0
    repeated_destinations: dict[str, int] = Field(default_factory=dict)


class IntelligenceAnalysisResult(BaseModel):
    """Consolidated intelligence analysis response payload."""
    model_config = ConfigDict(from_attributes=True)

    investigation_id: str | None = None
    findings: list[IntelligenceFinding] = Field(default_factory=list)
    statistics: dict[str, Any] = Field(default_factory=dict)
    rules_executed: list[str] = Field(default_factory=list)
    analysis_timestamp: str
    engine_version: str = "1.0.0"


class IntelligenceJob(BaseModel):
    """State tracking for asynchronous intelligence analysis jobs."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    investigation_id: str
    status: str = "QUEUED"
    findings_count: int = 0
    result: IntelligenceAnalysisResult | None = None
    error_message: str | None = None
    created_at: str
    updated_at: str
