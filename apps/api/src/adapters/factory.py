"""
Blockchain Adapter Factory
Central point for resolving blockchain adapter instances.
Source of truth: Master Prompt Section 2 & 5, docs/architecture.md Section 4.4
"""

from apps.api.src.adapters.base import BlockchainAdapter
from apps.api.src.adapters.evm import EvmAdapter
from apps.api.src.adapters.tron import TronAdapter
from chaintrace_shared import BlockchainType

_adapters: dict[BlockchainType, BlockchainAdapter] = {}


def get_blockchain_adapter(chain: str | BlockchainType) -> BlockchainAdapter:
    """Returns singleton instance of the requested blockchain adapter."""
    try:
        chain_enum = BlockchainType(
            chain.lower().strip() if isinstance(chain, str) else chain.value
        )
    except ValueError as exc:
        raise ValueError(
            f"Unsupported blockchain: '{chain}'. Supported: 'tron', 'ethereum', 'bsc', 'polygon'"
        ) from exc

    if chain_enum not in _adapters:
        if chain_enum == BlockchainType.TRON:
            _adapters[chain_enum] = TronAdapter()
        elif chain_enum in (
            BlockchainType.ETHEREUM,
            BlockchainType.BINANCE_SMART_CHAIN,
            BlockchainType.POLYGON,
        ):
            _adapters[chain_enum] = EvmAdapter(chain=chain_enum)
        elif chain_enum == BlockchainType.BITCOIN:
            raise NotImplementedError(
                "Bitcoin adapter interface is reserved. TRON and EVM implementations take precedence."
            )
        else:
            raise NotImplementedError(f"Adapter for {chain_enum} is not implemented.")

    return _adapters[chain_enum]
