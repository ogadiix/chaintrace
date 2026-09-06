"""
Normalized Blockchain Intelligence Data Models
Guarantees strict forensic provenance and common schema across all blockchains.
Source of truth: docs/architecture.md Section 4.5
"""
from datetime import UTC, datetime
from typing import Any

from chaintrace_shared import BlockchainType
from pydantic import BaseModel, ConfigDict, Field


class NormalizedTransaction(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    chain: BlockchainType
    tx_hash: str = Field(..., description="Transaction hash or transaction identifier")
    block_number: int = Field(default=0, description="Block height where transaction was confirmed")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    from_address: str = Field(..., description="Source wallet address")
    to_address: str = Field(..., description="Destination wallet address")
    asset: str = Field(..., description="Token symbol (e.g. USDT, TRX, ETH)")
    token_contract: str | None = Field(default=None, description="Smart contract address for token transfers")
    amount: str = Field(..., description="Decimal string preserving full blockchain token precision")
    fee: str = Field(default="0", description="Network gas or transaction fee paid")
    direction: str = Field(default="UNKNOWN", description="INCOMING, OUTGOING, or INTERNAL")
    provider: str = Field(..., description="Data provider source identifier (e.g., trongrid, llamarpc, demo_sandbox)")
    is_demo: bool = Field(default=False, description="Flag explicitly declaring if transaction is demo/mock data")
    raw_reference: dict[str, Any] = Field(default_factory=dict, description="Raw immutable provider payload for evidentiary provenance")


class WalletBalance(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    address: str
    chain: BlockchainType
    native_balance: str
    native_symbol: str
    token_balances: dict[str, str] = Field(default_factory=dict, description="Symbol -> Decimal balance string")
    updated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    provider: str = Field(...)
    is_demo: bool = Field(default=False)
