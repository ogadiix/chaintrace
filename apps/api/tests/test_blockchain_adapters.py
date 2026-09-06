"""
Phase 2 Blockchain Adapters Comprehensive Test Suite
Tests TRON, generic EVM (Ethereum, BSC, Polygon), Normalized Models, Resilience, and Integration.
Source of truth: Master Prompt Sections 14 & 15
"""

from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from apps.api.src.adapters.evm import EvmAdapter
from apps.api.src.adapters.exceptions import (
    InvalidWalletAddressError,
    ProviderTimeoutError,
    ProviderUnavailableError,
    RateLimitedError,
)
from apps.api.src.adapters.models import NormalizedTransaction
from apps.api.src.adapters.resilience import BlockchainCache, RetryPolicy
from apps.api.src.adapters.tron import TronAdapter, validate_tron_base58check
from apps.api.src.main import app
from chaintrace_shared import BlockchainType
from httpx import ASGITransport, AsyncClient

# ==============================================================================
# 1. TRON TESTS (Section 14)
# ==============================================================================


def test_tron_address_validation():
    # Valid Base58Check addresses
    assert validate_tron_base58check("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t") is True
    assert validate_tron_base58check("TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm") is True

    # Invalid addresses
    assert (
        validate_tron_base58check("0x71C7656EC7ab88b098defB751B7401B5f6d8976F") is False
    )  # EVM address
    assert (
        validate_tron_base58check("TInvalidAddressWithBadChecksum111111") is False
    )  # Bad checksum
    assert validate_tron_base58check("TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPx") is False  # Too short
    assert validate_tron_base58check("") is False
    assert validate_tron_base58check(None) is False  # type: ignore


@pytest.mark.asyncio
async def test_tron_trc20_and_native_normalization_mocked():
    adapter = TronAdapter()
    test_address = "TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm"

    # Mocked TronGrid TRC-20 response
    mock_payload = {
        "data": [
            {
                "transaction_id": "aa11bb22cc33dd44ee55ff667788990011223344556677889900aabbccddeeff",
                "block_number": 55100200,
                "block_timestamp": 1700000000000,
                "from": "TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm",
                "to": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                "value": "125500000",  # 125.500000 USDT (6 decimals)
                "token_info": {
                    "symbol": "USDT",
                    "address": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                    "decimals": 6,
                },
            }
        ],
        "meta": {"fingerprint": "next_page_token_abc"},
    }

    with patch.object(adapter, "_send_request", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = mock_payload
        txs, cursor = await adapter.get_transactions(test_address, limit=10)

        assert len(txs) == 1
        assert cursor == "next_page_token_abc"
        tx = txs[0]
        assert tx.chain == BlockchainType.TRON
        assert tx.asset == "USDT"
        assert tx.amount == "125.5"
        assert tx.direction == "OUTGOING"
        assert tx.block_number == 55100200
        assert tx.raw_reference == mock_payload["data"][0]
        assert tx.is_demo is False


@pytest.mark.asyncio
async def test_tron_provider_error_translation():
    adapter = TronAdapter()
    test_address = "TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm"

    # Test HTTP 429 Rate Limit
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.return_value = httpx.Response(
            status_code=429, request=httpx.Request("GET", "http://test")
        )
        with pytest.raises(RateLimitedError):
            await adapter.get_transactions(test_address)

    with (
        patch("httpx.AsyncClient.get", side_effect=httpx.TimeoutException("Timeout")),
        pytest.raises(ProviderTimeoutError),
    ):
        await adapter.get_transactions(test_address)


# ==============================================================================
# 2. EVM TESTS (Section 14)
# ==============================================================================


def test_evm_address_validation():
    adapter = EvmAdapter(chain=BlockchainType.ETHEREUM)
    assert adapter.validate_address("0x71C7656EC7ab88b098defB751B7401B5f6d8976F") is True
    assert adapter.validate_address("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045") is True

    # Invalid addresses
    assert adapter.validate_address("TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm") is False  # Tron address
    assert (
        adapter.validate_address("0x71C7656EC7ab88b098defB751B7401B5f6d8976") is False
    )  # 39 chars
    assert (
        adapter.validate_address("0xZZC7656EC7ab88b098defB751B7401B5f6d8976F") is False
    )  # Non-hex
    assert adapter.validate_address("") is False


@pytest.mark.asyncio
async def test_evm_multichain_support_and_normalization():
    # Test Ethereum, BSC, and Polygon configuration
    eth_adapter = EvmAdapter(chain=BlockchainType.ETHEREUM)
    bsc_adapter = EvmAdapter(chain=BlockchainType.BINANCE_SMART_CHAIN)
    pol_adapter = EvmAdapter(chain=BlockchainType.POLYGON)

    assert eth_adapter.chain == BlockchainType.ETHEREUM
    assert bsc_adapter.chain == BlockchainType.BINANCE_SMART_CHAIN
    assert pol_adapter.chain == BlockchainType.POLYGON

    test_addr = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"

    # Mock JSON-RPC for eth_getBalance and eth_call (USDT)
    with patch.object(eth_adapter, "_rpc_call", new_callable=AsyncMock) as mock_rpc:
        # 1.5 ETH in wei = 1500000000000000000 = 0x14d1120d7b160000
        mock_rpc.side_effect = ["0x14d1120d7b160000", "0x0"]
        balance = await eth_adapter.get_balance(test_addr)
        assert balance.native_symbol == "ETH"
        assert Decimal(balance.native_balance) == Decimal("1.5")


@pytest.mark.asyncio
async def test_evm_provider_failure_handling():
    adapter = EvmAdapter(chain=BlockchainType.ETHEREUM)

    # Test HTTP 500 error from RPC node
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = httpx.Response(
            status_code=500, request=httpx.Request("POST", "http://test")
        )
        with pytest.raises(ProviderUnavailableError):
            await adapter._rpc_call("eth_blockNumber", [])


# ==============================================================================
# 3. COMMON MODEL TESTS (Section 14)
# ==============================================================================


def test_normalized_model_precision_and_provenance():
    tx = NormalizedTransaction(
        chain=BlockchainType.TRON,
        tx_hash="0xabcd1234",
        block_number=1000,
        timestamp=datetime.now(UTC).isoformat(),
        from_address="TFrom",
        to_address="TTo",
        asset="USDT",
        amount="1250000.123456",  # Preserves high precision without float drift
        fee="2.5",
        direction="INCOMING",
        provider="trongrid",
        is_demo=False,
        raw_reference={"signature": ["raw_sig_bytes"]},
    )
    assert tx.amount == "1250000.123456"
    assert tx.raw_reference["signature"] == ["raw_sig_bytes"]
    assert tx.is_demo is False


# ==============================================================================
# 4. RESILIENCE: RETRY POLICY & CACHING TESTS (Sections 8, 10)
# ==============================================================================


@pytest.mark.asyncio
async def test_retry_policy_retries_transient_but_skips_permanent():
    policy = RetryPolicy(max_retries=3, initial_delay=0.01, max_delay=0.02)
    attempts = 0

    async def flaky_call():
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            raise RateLimitedError("Temporarily rate limited")
        return "SUCCESS"

    result = await policy.execute(flaky_call, operation_name="flaky")
    assert result == "SUCCESS"
    assert attempts == 3

    # Non-retryable error (InvalidWalletAddressError) should fail immediately on attempt 1
    async def bad_address_call():
        raise InvalidWalletAddressError("Malformed address")

    with pytest.raises(InvalidWalletAddressError):
        await policy.execute(bad_address_call, operation_name="bad_addr")


@pytest.mark.asyncio
async def test_blockchain_cache_immutability():
    cache = BlockchainCache(default_ttl_seconds=60, tx_ttl_seconds=3600)
    tx = NormalizedTransaction(
        chain=BlockchainType.ETHEREUM,
        tx_hash="0x123",
        block_number=1,
        timestamp="2026-09-06T00:00:00Z",
        from_address="0xA",
        to_address="0xB",
        asset="ETH",
        amount="1.0",
        provider="test",
    )
    await cache.set("tx", "ethereum:0x123", tx)
    cached_tx = await cache.get("tx", "ethereum:0x123")
    assert cached_tx is not None
    assert cached_tx.tx_hash == "0x123"


# ==============================================================================
# 5. INTEGRATION TEST (Section 15)
# API -> Trace Service -> Adapter -> Mock Provider -> Normalized Transaction
# ==============================================================================


@pytest.mark.asyncio
async def test_full_blockchain_service_and_api_integration():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login to obtain access token
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "investigator@chaintrace.internal", "password": "Investigator123!"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["accessToken"]
        auth_headers = {"Authorization": f"Bearer {token}"}

        # 2. Test Wallet Validation Endpoint
        val_res = await client.get(
            "/api/v1/blockchain/tron/validate/TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm",
            headers=auth_headers,
        )
        assert val_res.status_code == 200
        assert val_res.json()["is_valid"] is True

        # 3. Test Transactions Endpoint (Returns normalized transactions)
        tx_res = await client.get(
            "/api/v1/blockchain/tron/wallet/TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm/transactions?limit=5",
            headers=auth_headers,
        )
        assert tx_res.status_code == 200
        data = tx_res.json()
        assert data["chain"] == "tron"
        assert len(data["transactions"]) > 0
        first_tx = data["transactions"][0]
        assert "tx_hash" in first_tx
        assert "amount" in first_tx
        assert "asset" in first_tx
        # Verify no provider secrets leaked
        assert "TRON-PRO-API-KEY" not in str(data)
        assert "api_key" not in str(data)

        # 4. Test Single Transaction Lookup with Evidentiary Caching
        single_tx_res = await client.get(
            f"/api/v1/blockchain/tron/tx/{first_tx['tx_hash']}",
            headers=auth_headers,
        )
        assert single_tx_res.status_code == 200
        assert single_tx_res.json()["tx_hash"] == first_tx["tx_hash"]

        # 5. Verify Unauthenticated Request is rejected (Security check)
        unauth_res = await client.get(
            "/api/v1/blockchain/tron/wallet/TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm/transactions"
        )
        assert unauth_res.status_code in (401, 403)
