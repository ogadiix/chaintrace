"""
Blockchain Intelligence Trace Service
Orchestrates blockchain adapters, caching, validation, and controlled error handling.
Acts as the architectural service boundary between FastAPI routers and provider adapters.
Source of truth: Master Prompt Architecture & Objective
"""

import logging

from apps.api.src.adapters.exceptions import (
    BlockchainError,
    InvalidWalletAddressError,
    ProviderUnavailableError,
    TransactionNotFoundError,
)
from apps.api.src.adapters.factory import get_blockchain_adapter
from apps.api.src.adapters.models import NormalizedTransaction, WalletBalance
from apps.api.src.adapters.resilience import BlockchainCache
from apps.api.src.core.config import settings
from chaintrace_shared import BlockchainType

logger = logging.getLogger(__name__)


class BlockchainService:
    """
    Core Trace & Blockchain intelligence service.
    Ensures the frontend never communicates directly with blockchain providers.
    Provides evidentiary caching, address validation, and strict exception boundaries.
    """

    def __init__(self, cache: BlockchainCache | None = None):
        self._cache = cache or BlockchainCache(
            default_ttl_seconds=settings.BLOCKCHAIN_CACHE_TTL_SECONDS,
            tx_ttl_seconds=3600,
        )

    def validate_address(self, chain: str | BlockchainType, address: str) -> bool:
        """Validates wallet address structure and checksum via the appropriate chain adapter."""
        try:
            adapter = get_blockchain_adapter(chain)
            return adapter.validate_address(address)
        except Exception:
            return False

    async def get_balance(self, chain: str | BlockchainType, address: str) -> WalletBalance:
        """Fetches native and token balances for an address."""
        adapter = get_blockchain_adapter(chain)
        if not adapter.validate_address(address):
            raise InvalidWalletAddressError(
                f"Address '{address}' is not a valid {adapter.chain.value} address"
            )

        try:
            return await adapter.get_balance(address)
        except BlockchainError:
            raise
        except Exception as exc:
            logger.error("Unexpected error in get_balance for %s on %s: %s", address, chain, exc)
            raise ProviderUnavailableError(
                f"Failed to retrieve balance from {adapter.chain.value}"
            ) from exc

    async def get_transactions(
        self,
        chain: str | BlockchainType,
        address: str,
        limit: int = 50,
        cursor: str | None = None,
    ) -> tuple[list[NormalizedTransaction], str | None]:
        """Fetches normalized transactions with pagination."""
        adapter = get_blockchain_adapter(chain)
        if not adapter.validate_address(address):
            raise InvalidWalletAddressError(
                f"Address '{address}' is not a valid {adapter.chain.value} address"
            )

        bounded_limit = max(1, min(limit, 100))
        try:
            return await adapter.get_transactions(address, cursor=cursor, limit=bounded_limit)
        except BlockchainError:
            raise
        except Exception as exc:
            logger.error(
                "Unexpected error in get_transactions for %s on %s: %s", address, chain, exc
            )
            raise ProviderUnavailableError(
                f"Failed to query transactions from {adapter.chain.value}"
            ) from exc

    async def get_transaction(
        self,
        chain: str | BlockchainType,
        tx_hash: str,
    ) -> NormalizedTransaction:
        """
        Fetches a normalized transaction by hash, utilizing an evidentiary cache
        to avoid redundant provider calls for immutable confirmed transactions.
        """
        adapter = get_blockchain_adapter(chain)
        clean_hash = tx_hash.strip()

        # Evidentiary Cache check
        cached = await self._cache.get("tx", f"{adapter.chain.value}:{clean_hash}")
        if cached and isinstance(cached, NormalizedTransaction):
            return cached

        try:
            tx = await adapter.get_transaction(clean_hash)
            if not tx:
                raise TransactionNotFoundError(
                    f"Transaction '{clean_hash}' not found on {adapter.chain.value}"
                )

            # Store in immutable evidentiary cache
            await self._cache.set("tx", f"{adapter.chain.value}:{clean_hash}", tx, ttl=3600)
            return tx
        except BlockchainError:
            raise
        except Exception as exc:
            logger.error(
                "Unexpected error in get_transaction for %s on %s: %s", clean_hash, chain, exc
            )
            raise ProviderUnavailableError(
                f"Failed to retrieve transaction from {adapter.chain.value}"
            ) from exc


# Service Singleton
_service_instance: BlockchainService | None = None


def get_blockchain_service() -> BlockchainService:
    global _service_instance
    if _service_instance is None:
        _service_instance = BlockchainService()
    return _service_instance
