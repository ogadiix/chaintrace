"""
Blockchain Adapter Factory
Central point for resolving blockchain adapter instances.
"""
from apps.api.src.adapters.base import BlockchainAdapter
from apps.api.src.adapters.evm import EvmAdapter
from apps.api.src.adapters.tron import TronAdapter
from chaintrace_shared import BlockchainType

_adapters: dict[BlockchainType, BlockchainAdapter] = {}


def get_blockchain_adapter(chain: str | BlockchainType) -> BlockchainAdapter:
    """Returns singleton instance of the requested blockchain adapter."""
    try:
        chain_enum = BlockchainType(chain.lower() if isinstance(chain, str) else chain.value)
    except ValueError as exc:
        raise ValueError(f"Unsupported blockchain: '{chain}'. Supported: 'tron', 'ethereum'") from exc

    if chain_enum not in _adapters:
        if chain_enum == BlockchainType.TRON:
            _adapters[chain_enum] = TronAdapter()
        elif chain_enum == BlockchainType.ETHEREUM:
            _adapters[chain_enum] = EvmAdapter()
        else:
            raise NotImplementedError(f"Adapter for {chain_enum} is deferred until TRON and EVM are stabilized.")

    return _adapters[chain_enum]
