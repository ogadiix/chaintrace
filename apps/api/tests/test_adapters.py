"""
Blockchain Adapter Tests for TRON and EVM
Tests address validation, transaction normalization, balance queries, and evidentiary provenance.
"""
import pytest
from apps.api.src.adapters.evm import EvmAdapter
from apps.api.src.adapters.factory import get_blockchain_adapter
from apps.api.src.adapters.tron import TronAdapter
from apps.api.src.main import app
from chaintrace_shared import BlockchainType
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_tron_adapter_core_functionality():
    adapter = TronAdapter()
    assert adapter.chain == BlockchainType.TRON
    assert adapter.provider_name == "trongrid"

    # Address validation
    assert adapter.validate_address("TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm") is True
    assert adapter.validate_address("0x71C7656EC7ab88b098defB751B7401B5f6d8976F") is False
    assert adapter.validate_address("InvalidAddress") is False

    # Balance query
    balance = await adapter.get_balance("TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm")
    assert balance.chain == BlockchainType.TRON
    assert balance.native_symbol == "TRX"
    assert "USDT" in balance.token_balances

    # Transaction normalization
    txs, _cursor = await adapter.get_transactions("TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm", limit=10)
    assert len(txs) > 0
    for tx in txs:
        assert tx.chain == BlockchainType.TRON
        assert tx.asset == "USDT"
        assert tx.tx_hash is not None
        assert tx.from_address is not None
        assert tx.to_address is not None
        assert float(tx.amount) > 0
        assert tx.raw_reference is not None  # Provenance retained!

    # Single transaction lookup
    single_tx = await adapter.get_transaction("c3a2f6b891e457d1928374a5b6c7d8e9f0123456789abcdef0123456789abcde")
    assert single_tx is not None
    assert single_tx.chain == BlockchainType.TRON


@pytest.mark.asyncio
async def test_evm_adapter_core_functionality():
    adapter = EvmAdapter()
    assert adapter.chain == BlockchainType.ETHEREUM
    assert adapter.provider_name == "evm_rpc"

    # Address validation
    assert adapter.validate_address("0x71C7656EC7ab88b098defB751B7401B5f6d8976F") is True
    assert adapter.validate_address("TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm") is False
    assert adapter.validate_address("0xinvalid") is False

    # Balance query
    balance = await adapter.get_balance("0x71C7656EC7ab88b098defB751B7401B5f6d8976F")
    assert balance.chain == BlockchainType.ETHEREUM
    assert balance.native_symbol == "ETH"

    # Transactions query
    txs, _cursor = await adapter.get_transactions("0x71C7656EC7ab88b098defB751B7401B5f6d8976F", limit=10)
    assert len(txs) > 0
    for tx in txs:
        assert tx.chain == BlockchainType.ETHEREUM
        assert tx.asset == "USDT"
        assert tx.tx_hash.startswith("0x")
        assert tx.raw_reference is not None  # Provenance retained!


def test_blockchain_adapter_factory():
    tron = get_blockchain_adapter("tron")
    assert isinstance(tron, TronAdapter)

    eth = get_blockchain_adapter("ethereum")
    assert isinstance(eth, EvmAdapter)

    with pytest.raises(ValueError, match="Unsupported blockchain"):
        get_blockchain_adapter("solana")


@pytest.mark.asyncio
async def test_adapter_api_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login to get token
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "investigator@chaintrace.internal",
            "password": "Investigator123!"
        })
        token = login_res.json()["accessToken"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Validate Address Endpoint
        res_val = await ac.get(
            "/api/v1/adapters/validate-address?chain=tron&address=TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm",
            headers=headers
        )
        assert res_val.status_code == 200
        assert res_val.json()["isValid"] is True

        # 3. Get TRON Wallet Balance
        res_bal = await ac.get(
            "/api/v1/adapters/tron/wallets/TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm/balance",
            headers=headers
        )
        assert res_bal.status_code == 200
        bal_data = res_bal.json()
        assert bal_data["chain"] == "tron"
        assert "USDT" in bal_data["token_balances"]

        # 4. Get TRON Transactions
        res_txs = await ac.get(
            "/api/v1/adapters/tron/wallets/TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm/transactions?limit=5",
            headers=headers
        )
        assert res_txs.status_code == 200
        tx_list = res_txs.json()
        assert len(tx_list) > 0
        assert tx_list[0]["chain"] == "tron"
        assert "raw_reference" in tx_list[0]

        # 5. Invalid Address returns 422
        res_invalid = await ac.get(
            "/api/v1/adapters/tron/wallets/0x71C7656EC7ab88b098defB751B7401B5f6d8976F/transactions",
            headers=headers
        )
        assert res_invalid.status_code == 422
