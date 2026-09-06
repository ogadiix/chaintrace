"""
Abstract Base Blockchain Adapter Interface
Guarantees provider-independence across all blockchain integrations.
Source of truth: docs/architecture.md Section 4.4
"""
from abc import ABC, abstractmethod

from apps.api.src.adapters.models import NormalizedTransaction, WalletBalance
from chaintrace_shared import BlockchainType


class BlockchainAdapter(ABC):
    @property
    @abstractmethod
    def chain(self) -> BlockchainType:
        """The specific blockchain supported by this adapter."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the backend provider service (e.g. 'trongrid', 'llamarpc')."""

    @abstractmethod
    def validate_address(self, address: str) -> bool:
        """Validates format and checksum of the blockchain address."""

    @abstractmethod
    async def get_transactions(
        self,
        address: str,
        cursor: str | None = None,
        limit: int = 50,
    ) -> tuple[list[NormalizedTransaction], str | None]:
        """
        Retrieves and normalizes confirmed transactions for a wallet address.
        Returns: (list_of_normalized_transactions, next_page_cursor)
        """

    @abstractmethod
    async def get_transaction(self, tx_hash: str) -> NormalizedTransaction | None:
        """Retrieves and normalizes a single transaction by hash."""

    @abstractmethod
    async def get_balance(self, address: str) -> WalletBalance:
        """Retrieves confirmed native and token balances for an address."""
