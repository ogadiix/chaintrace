"""
VASP & Entity Attribution Data Models
Defines entities, wallet labels, confidence scoring models, and investigation attribution results.
Source of truth: Master Prompt Phase 6 Sections 2, 3, 4, 11, 12
"""
from typing import Any

from chaintrace_shared import AttributionConfidence, AttributionStatus, BlockchainType, EntityType
from pydantic import BaseModel, ConfigDict, Field


class VaspEntity(BaseModel):
    """Represents a recognized legal or operational blockchain entity (Exchange, VASP, Mixer, etc.)."""
    model_config = ConfigDict(from_attributes=True)

    entity_id: str = Field(..., description="Unique entity ID e.g. 'vasp_binance', 'mixer_tornado'")
    name: str = Field(..., description="Legal or common operational name")
    entity_type: EntityType = Field(..., description="Entity taxonomy classification")
    jurisdiction: str | None = Field(default=None, description="Country or operating jurisdiction")
    status: str = Field(default="ACTIVE", description="'ACTIVE', 'SANCTIONED', 'DEFUNCT', 'INVESTIGATION_TARGET'")
    source: str = Field(..., description="Provenance source of the entity record")
    source_url: str | None = None
    confidence: AttributionConfidence = Field(default=AttributionConfidence.CONFIRMED)
    website: str | None = None
    created_at: str
    updated_at: str


class WalletLabel(BaseModel):
    """Associates a specific blockchain address with an entity label with full source provenance."""
    model_config = ConfigDict(from_attributes=True)

    chain: BlockchainType
    address: str = Field(..., description="Blockchain address")
    entity_id: str = Field(..., description="Referenced VaspEntity entity_id")
    label_type: str = Field(default="DEPOSIT", description="'HOT_WALLET', 'COLD_WALLET', 'DEPOSIT', 'ROUTER', 'SANCTIONED'")
    confidence: AttributionConfidence = Field(default=AttributionConfidence.CONFIRMED)
    source: str = Field(..., description="Source provenance e.g. 'PUBLIC_DISCLOSURE', 'OFAC', 'DEMO_DATA'")
    source_reference: str | None = Field(default=None, description="URL or documentary reference ID")
    is_demo: bool = Field(default=False, description="Flag indicating demonstration mock label")
    notes: str | None = None


class WalletAttribution(BaseModel):
    """Attribution evaluation outcome for an investigated wallet address."""
    model_config = ConfigDict(from_attributes=True)

    wallet: str
    chain: BlockchainType
    status: AttributionStatus = Field(..., description="'MATCHED', 'CONFLICTING_LABELS', or 'UNKNOWN'")
    entity: VaspEntity | None = None
    confidence: AttributionConfidence = Field(default=AttributionConfidence.UNKNOWN)
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    confidence_reasons: list[str] = Field(default_factory=list)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    labels: list[WalletLabel] = Field(default_factory=list)
    dataset_version: str = "vasp_labels_v1"
    attributed_via: str = Field(default="NONE", description="'EXACT_MATCH', 'PATH_ENDPOINT', 'CLUSTER', 'NONE'")


class AttributionAnalysisResult(BaseModel):
    """Consolidated attribution report across all wallets discovered in an investigation trace."""
    model_config = ConfigDict(from_attributes=True)

    investigation_id: str | None = None
    seed_wallet: str
    matched_count: int = 0
    unknown_count: int = 0
    conflict_count: int = 0
    attributions: list[WalletAttribution] = Field(default_factory=list)
    terminal_attributions: list[WalletAttribution] = Field(default_factory=list)
    dataset_version: str = "vasp_labels_v1"
    engine_version: str = "1.0.0"
    analyzed_at: str
