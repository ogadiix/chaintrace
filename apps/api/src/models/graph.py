"""
Graph Data Models & Schemas
Defines core property graph entities, frontend graph response payloads,
and ingestion metadata metrics for Neo4j.
Source of truth: docs/architecture.md Section 4.6 & Master Prompt Sections 4-8
"""
from typing import Any

from chaintrace_shared import BlockchainType
from pydantic import BaseModel, ConfigDict, Field


class GraphNode(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Globally unique node ID e.g. 'tron:TA4Wt1...' or 'tx:tron:8a1b...'")
    type: str = Field(..., description="'wallet' or 'transaction'")
    label: str = Field(..., description="Short display label for investigators")
    chain: str = Field(..., description="Blockchain identifier e.g. 'tron', 'ethereum', 'bsc'")
    properties: dict[str, Any] = Field(default_factory=dict, description="Arbitrary forensic attributes")


class GraphEdge(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Globally unique edge ID")
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    type: str = Field(default="transfer", description="Relationship type: 'TRANSFER', 'SENT', 'TO'")
    properties: dict[str, Any] = Field(default_factory=dict, description="Edge properties (amount, asset, fee, timestamp)")


class GraphSummary(BaseModel):
    node_count: int = 0
    edge_count: int = 0
    chains: list[str] = Field(default_factory=list)
    total_volume_by_asset: dict[str, str] = Field(default_factory=dict)


class GraphResponse(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    summary: GraphSummary = Field(default_factory=GraphSummary)


class IngestionResult(BaseModel):
    status: str = Field(..., description="'COMPLETED', 'PARTIAL', or 'FAILED'")
    transactions_processed: int = 0
    wallets_created: int = 0
    transactions_created: int = 0
    edges_created: int = 0
    duration_ms: float = 0.0
    case_id: str | None = None
    chain: str | None = None
    error_message: str | None = None


class WalletNodeProperties(BaseModel):
    id: str
    address: str
    chain: BlockchainType
    first_seen: str
    last_seen: str
    transaction_count: int = 0
    risk_score: float = 0.0
    tags: list[str] = Field(default_factory=list)
    is_demo: bool = False
