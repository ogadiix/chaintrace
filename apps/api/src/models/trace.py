"""
Trace Engine Pydantic Models & Schemas
Defines request parameters, hops, paths, terminal classifications, and trace result structures.
All amounts are represented as strings/Decimals to guarantee zero precision loss.
Source of truth: Master Prompt Phase 4 Sections 2, 5, 6, 12, 14, 15
"""
from typing import Any

from chaintrace_shared import BlockchainType, JobStatus, TerminalReason, TraceDirection
from pydantic import BaseModel, ConfigDict, Field


class TraceRequest(BaseModel):
    """Strongly typed investigator trace request with safe authoritative defaults."""
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    chain: BlockchainType
    seed_wallet: str = Field(..., description="Starting seed wallet address")
    max_hops: int = Field(default=4, ge=1, le=7, description="Traversal depth limit (authoritative max 7)")
    minimum_amount: str | None = Field(default=None, description="Minimum transfer amount threshold in asset units")
    start_time: str | None = Field(default=None, description="ISO-8601 UTC timestamp lower bound")
    end_time: str | None = Field(default=None, description="ISO-8601 UTC timestamp upper bound")
    asset: str | None = Field(default=None, description="Asset/symbol filter e.g. 'USDT', 'TRX', 'ETH'")
    token_contract: str | None = Field(default=None, description="Specific token contract address filter")
    direction: TraceDirection = Field(default=TraceDirection.FORWARD, description="Traversal direction: FORWARD or BACKWARD")
    max_nodes: int = Field(default=1000, ge=10, le=2000, description="Max unique wallets/transactions to process")
    max_paths: int = Field(default=100, ge=1, le=500, description="Max total paths returned")


class TraceHop(BaseModel):
    """Represents a single step / transfer in a money flow path."""
    model_config = ConfigDict(from_attributes=True)

    hop_number: int = Field(..., description="1-based hop index from the seed wallet")
    from_wallet: str = Field(..., description="Sender wallet address")
    to_wallet: str = Field(..., description="Recipient wallet address")
    tx_hash: str = Field(..., description="Blockchain transaction hash")
    chain: BlockchainType
    asset: str = Field(..., description="Asset symbol e.g. 'USDT', 'ETH'")
    token_contract: str | None = None
    amount: str = Field(..., description="Transfer amount as string preserving full decimal precision")
    fee: str = Field(default="0.0", description="Transaction fee")
    timestamp: str = Field(..., description="ISO-8601 UTC timestamp")


class TracePath(BaseModel):
    """A sequence of connected hops forming an end-to-end investigative flow."""
    model_config = ConfigDict(from_attributes=True)

    path_id: str
    hops: list[TraceHop] = Field(default_factory=list)
    total_amount: str = Field(default="0", description="Sum of hop amounts or initial outflow")
    terminal_wallet: str = Field(..., description="Final wallet where this path terminated")
    terminal_reason: TerminalReason = Field(..., description="Why the path ceased traversing")


class TerminalNodeInfo(BaseModel):
    wallet: str
    reason: TerminalReason
    hop_level: int = 0
    details: str | None = None


class TraceStatistics(BaseModel):
    nodes: int = 0
    edges: int = 0
    paths: int = 0
    max_hop_reached: int = 0
    duration_ms: float = 0.0


class TraceResult(BaseModel):
    """Structured forensic trace result payload."""
    model_config = ConfigDict(from_attributes=True)

    investigation_id: str | None = None
    job_id: str | None = None
    seed: dict[str, str] = Field(..., description="Seed chain and address")
    configuration: TraceRequest
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    paths: list[TracePath] = Field(default_factory=list)
    terminals: list[TerminalNodeInfo] = Field(default_factory=list)
    statistics: TraceStatistics = Field(default_factory=TraceStatistics)
    status: JobStatus = Field(default=JobStatus.COMPLETED)
    message: str | None = None


class TraceJob(BaseModel):
    """State tracking model for asynchronous trace executions."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    investigation_id: str | None = None
    chain: BlockchainType
    seed_wallet: str
    status: JobStatus = JobStatus.QUEUED
    progress: dict[str, Any] = Field(default_factory=dict)
    result: TraceResult | None = None
    error_message: str | None = None
    created_at: str
    updated_at: str
