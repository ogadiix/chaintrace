"""
Phase 3 Graph Construction Comprehensive Test Suite
Tests Property Graph entities, Ingestion, Multi-Chain Separation, Idempotency,
Parameterized Cypher Security, and Graph Query REST APIs.
Source of truth: Master Prompt Section 20
"""
from datetime import UTC, datetime

import pytest
from apps.api.src.adapters.models import NormalizedTransaction
from apps.api.src.core.in_memory_graph import InMemoryGraphStore
from apps.api.src.main import app
from apps.api.src.services.graph_service import GraphService
from chaintrace_shared import BlockchainType
from httpx import ASGITransport, AsyncClient

# ==============================================================================
# 1. WALLET & TRANSACTION NODE TESTS (Sections 5, 6, 8)
# ==============================================================================

@pytest.mark.asyncio
async def test_wallet_node_creation_and_multi_chain_separation():
    store = InMemoryGraphStore()
    now = datetime.now(UTC).isoformat()

    # Same address on Ethereum and BSC must create 2 distinct nodes!
    addr = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
    w1_id, created1 = await store.upsert_wallet("ethereum", addr, now)
    w2_id, created2 = await store.upsert_wallet("bsc", addr, now)

    assert created1 is True
    assert created2 is True
    assert w1_id == f"ethereum:{addr}"
    assert w2_id == f"bsc:{addr}"
    assert w1_id != w2_id

    # Duplicate wallet on same chain must NOT create a new node (Idempotent update)
    w1_dup_id, created_dup = await store.upsert_wallet("ethereum", addr, now)
    assert created_dup is False
    assert w1_dup_id == w1_id


@pytest.mark.asyncio
async def test_transaction_node_creation_and_chain_separation():
    store = InMemoryGraphStore()
    now = datetime.now(UTC).isoformat()

    tx_eth = NormalizedTransaction(
        chain=BlockchainType.ETHEREUM,
        tx_hash="0xabcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234",
        block_number=19000000,
        timestamp=now,
        from_address="0x1111111111111111111111111111111111111111",
        to_address="0x2222222222222222222222222222222222222222",
        asset="USDT",
        amount="5000.00",
        fee="0.002",
        provider="evm_test",
    )

    tx_bsc = NormalizedTransaction(
        chain=BlockchainType.BINANCE_SMART_CHAIN,
        tx_hash="0xabcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234",  # Same hash
        block_number=35000000,
        timestamp=now,
        from_address="0x1111111111111111111111111111111111111111",
        to_address="0x2222222222222222222222222222222222222222",
        asset="USDT",
        amount="5000.00",
        fee="0.0005",
        provider="bsc_test",
    )

    id_eth, eth_created = await store.upsert_transaction(tx_eth)
    id_bsc, bsc_created = await store.upsert_transaction(tx_bsc)

    assert eth_created is True
    assert bsc_created is True
    assert id_eth != id_bsc
    assert id_eth.startswith("ethereum:")
    assert id_bsc.startswith("bsc:")

    # Duplicate transaction idempotency
    id_dup, dup_created = await store.upsert_transaction(tx_eth)
    assert dup_created is False
    assert id_dup == id_eth


# ==============================================================================
# 2. RELATIONSHIPS & INGESTION IDEMPOTENCY TESTS (Sections 7, 9, 10, 11)
# ==============================================================================

@pytest.mark.asyncio
async def test_graph_ingestion_relationships_and_strict_idempotency():
    store = InMemoryGraphStore()
    service = GraphService(in_memory_store=store)
    now = datetime.now(UTC).isoformat()

    tx = NormalizedTransaction(
        chain=BlockchainType.TRON,
        tx_hash="8a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef",
        block_number=54128910,
        timestamp=now,
        from_address="TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm",
        to_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        asset="USDT",
        token_contract="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        amount="50000.00",
        fee="2.8",
        provider="trongrid",
        is_demo=False,
    )

    # RUN 1: First Ingestion
    res1 = await service.ingest_transactions([tx])
    assert res1.status == "COMPLETED"
    assert res1.transactions_processed == 1
    assert res1.wallets_created == 2  # Source & destination
    assert res1.transactions_created == 1
    assert res1.edges_created == 1

    # Verify graph state after Run 1
    graph1 = await service.get_wallet_graph("tron", "TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm")
    assert graph1.summary.node_count == 2
    assert graph1.summary.edge_count == 1

    # RUN 2: Exact Duplicate Ingestion (Must be 100% idempotent!)
    res2 = await service.ingest_transactions([tx])
    assert res2.status == "COMPLETED"
    assert res2.transactions_processed == 1
    assert res2.wallets_created == 0  # No new wallets
    assert res2.transactions_created == 0  # No new transactions
    assert res2.edges_created == 0  # No new edges

    # Verify graph state did not change
    graph2 = await service.get_wallet_graph("tron", "TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm")
    assert graph2.summary.node_count == 2
    assert graph2.summary.edge_count == 1


# ==============================================================================
# 3. DEMO FRAUD NETWORK TEST (Section 19)
# ==============================================================================

@pytest.mark.asyncio
async def test_demo_fraud_network_loader():
    store = InMemoryGraphStore()
    service = GraphService(in_memory_store=store)

    result = await service.load_demo_fraud_network(chain="tron")
    assert result.status == "COMPLETED"
    assert result.transactions_processed == 5

    # Check that the Victim and Suspect are in the graph with demo flags
    victim_graph = await service.get_wallet_graph("tron", "TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm")
    assert victim_graph.summary.node_count >= 2
    assert victim_graph.summary.edge_count >= 1
    assert any(e.properties.get("is_demo") is True for e in victim_graph.edges)


# ==============================================================================
# 4. GRAPH REST API ENDPOINT TESTS (Sections 12-16)
# ==============================================================================

@pytest.mark.asyncio
async def test_graph_api_endpoints_and_defensive_limits():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "investigator@chaintrace.internal", "password": "Investigator123!"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["accessToken"]
        auth_headers = {"Authorization": f"Bearer {token}"}

        # 2. Ingest demo fraud network via API
        demo_res = await client.post("/api/v1/graph/demo-network?chain=tron", headers=auth_headers)
        assert demo_res.status_code == 200
        assert demo_res.json()["status"] == "COMPLETED"

        # 3. Query wallet subgraph
        wallet_res = await client.get(
            "/api/v1/graph/wallet/tron/TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm?limit=10",
            headers=auth_headers,
        )
        assert wallet_res.status_code == 200
        data = wallet_res.json()
        assert len(data["nodes"]) > 0
        assert len(data["edges"]) > 0
        assert data["summary"]["node_count"] == len(data["nodes"])

        # 4. Query transaction subgraph
        tx_res = await client.get(
            "/api/v1/graph/transaction/tron/demo_tx_hop1_victim_to_suspect_001",
            headers=auth_headers,
        )
        assert tx_res.status_code == 200
        tx_data = tx_res.json()
        assert tx_data["summary"]["node_count"] >= 1

        # 5. Verify defensive limit enforcement
        bad_limit_res = await client.get(
            "/api/v1/graph/wallet/tron/TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm?limit=9999",
            headers=auth_headers,
        )
        assert bad_limit_res.status_code == 422  # Pydantic Query le=200 validation

        # 6. Verify unauthenticated access rejection
        unauth_res = await client.get("/api/v1/graph/wallet/tron/TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm")
        assert unauth_res.status_code in (401, 403)
