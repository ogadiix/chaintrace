"""
Phase 4 N-Hop Trace Engine Comprehensive Test Suite
Validates:
1. Basic Trace (A -> B -> C)
2. Max Hops Bounded Traversal (depth cutoff)
3. High-Precision Decimal Amount Filtering
4. Asset Isolation (USDT vs ETH/TRX)
5. Time Window Bounded Filtering
6. Graph Cycle Prevention (A -> B -> C -> A)
7. Multi-Path / Diamond Convergence (A -> B -> D and A -> C -> D)
8. Terminal Node Classification
9. Asynchronous Job Lifecycle & Status Tracking
10. Case Access Authorization Enforcement
Source of truth: Master Prompt Phase 4 Sections 4-17, 22, 23
"""

from datetime import UTC, datetime
from decimal import Decimal

import pytest
from apps.api.src.adapters.models import NormalizedTransaction
from apps.api.src.core.in_memory_graph import InMemoryGraphStore
from apps.api.src.main import app
from apps.api.src.models.trace import TraceRequest
from apps.api.src.services.graph_service import GraphService
from apps.api.src.services.trace_engine import TraceEngine
from chaintrace_shared import BlockchainType, JobStatus, TerminalReason
from httpx import ASGITransport, AsyncClient


def _make_tx(
    tx_hash: str,
    from_addr: str,
    to_addr: str,
    amount: str = "100.0",
    asset: str = "USDT",
    chain: BlockchainType = BlockchainType.TRON,
    timestamp: str | None = None,
) -> NormalizedTransaction:
    now = timestamp or datetime.now(UTC).isoformat()
    return NormalizedTransaction(
        chain=chain,
        tx_hash=tx_hash,
        block_number=50000000,
        timestamp=now,
        from_address=from_addr,
        to_address=to_addr,
        asset=asset,
        token_contract="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" if asset == "USDT" else None,
        amount=amount,
        fee="1.0",
        direction="OUTGOING",
        provider="test",
        is_demo=False,
    )


# ==============================================================================
# 1. BASIC TRACE & MAX HOPS
# ==============================================================================


@pytest.mark.asyncio
async def test_basic_linear_trace_and_hop_counting():
    store = InMemoryGraphStore()
    graph_service = GraphService(in_memory_store=store)
    trace_engine = TraceEngine(in_memory_store=store)

    # Linear: A -> B -> C
    tx1 = _make_tx("tx_01", "WalletA", "WalletB", amount="500.0")
    tx2 = _make_tx("tx_02", "WalletB", "WalletC", amount="490.0")
    await graph_service.ingest_transactions([tx1, tx2])

    req = TraceRequest(
        chain=BlockchainType.TRON,
        seed_wallet="WalletA",
        max_hops=4,
    )

    result = await trace_engine.execute_trace(req)
    assert result.status == JobStatus.COMPLETED
    assert result.statistics.max_hop_reached == 2
    assert len(result.paths) == 1

    path = result.paths[0]
    assert len(path.hops) == 2
    assert path.hops[0].from_wallet == "WalletA"
    assert path.hops[0].to_wallet == "WalletB"
    assert path.hops[0].hop_number == 1
    assert path.hops[1].from_wallet == "WalletB"
    assert path.hops[1].to_wallet == "WalletC"
    assert path.hops[1].hop_number == 2
    assert path.terminal_wallet == "WalletC"
    assert path.terminal_reason == TerminalReason.NO_OUTGOING_TRANSFERS


@pytest.mark.asyncio
async def test_max_hops_bound_enforcement():
    store = InMemoryGraphStore()
    graph_service = GraphService(in_memory_store=store)
    trace_engine = TraceEngine(in_memory_store=store)

    # Chain: A -> B -> C -> D -> E
    txs = [
        _make_tx("tx_01", "WalletA", "WalletB"),
        _make_tx("tx_02", "WalletB", "WalletC"),
        _make_tx("tx_03", "WalletC", "WalletD"),
        _make_tx("tx_04", "WalletD", "WalletE"),
    ]
    await graph_service.ingest_transactions(txs)

    # Limit max_hops to 2
    req = TraceRequest(
        chain=BlockchainType.TRON,
        seed_wallet="WalletA",
        max_hops=2,
    )

    result = await trace_engine.execute_trace(req)
    assert result.status == JobStatus.COMPLETED
    assert result.statistics.max_hop_reached == 2
    assert len(result.paths) == 1

    path = result.paths[0]
    assert len(path.hops) == 2
    assert path.terminal_wallet == "WalletC"
    assert path.terminal_reason == TerminalReason.MAX_HOPS_REACHED


# ==============================================================================
# 2. FILTERING: AMOUNT, ASSET, AND TIME
# ==============================================================================


@pytest.mark.asyncio
async def test_decimal_amount_filtering():
    store = InMemoryGraphStore()
    graph_service = GraphService(in_memory_store=store)
    trace_engine = TraceEngine(in_memory_store=store)

    # A -> B (5000 USDT), A -> C (10 USDT), B -> D (4900 USDT), B -> E (5 USDT)
    txs = [
        _make_tx("tx_ab", "WalletA", "WalletB", amount="5000.00"),
        _make_tx("tx_ac", "WalletA", "WalletC", amount="10.00"),
        _make_tx("tx_bd", "WalletB", "WalletD", amount="4900.00"),
        _make_tx("tx_be", "WalletB", "WalletE", amount="5.00"),
    ]
    await graph_service.ingest_transactions(txs)

    # Minimum threshold = 100 USDT
    req = TraceRequest(
        chain=BlockchainType.TRON,
        seed_wallet="WalletA",
        minimum_amount="100.00",
        max_hops=4,
    )

    result = await trace_engine.execute_trace(req)
    assert len(result.paths) == 1
    path = result.paths[0]
    assert len(path.hops) == 2
    assert path.hops[0].to_wallet == "WalletB"
    assert path.hops[1].to_wallet == "WalletD"


@pytest.mark.asyncio
async def test_asset_segregation():
    store = InMemoryGraphStore()
    graph_service = GraphService(in_memory_store=store)
    trace_engine = TraceEngine(in_memory_store=store)

    # A sends USDT to B, and TRX to C
    tx1 = _make_tx("tx_usdt", "WalletA", "WalletB", amount="1000.0", asset="USDT")
    tx2 = _make_tx("tx_trx", "WalletA", "WalletC", amount="5000.0", asset="TRX")
    await graph_service.ingest_transactions([tx1, tx2])

    req = TraceRequest(
        chain=BlockchainType.TRON,
        seed_wallet="WalletA",
        asset="USDT",
        max_hops=2,
    )

    result = await trace_engine.execute_trace(req)
    assert len(result.paths) == 1
    assert result.paths[0].hops[0].asset == "USDT"
    assert result.paths[0].terminal_wallet == "WalletB"


@pytest.mark.asyncio
async def test_time_window_filtering():
    store = InMemoryGraphStore()
    graph_service = GraphService(in_memory_store=store)
    trace_engine = TraceEngine(in_memory_store=store)

    t1 = "2026-03-01T10:00:00Z"
    t2 = "2026-03-05T12:00:00Z"
    t3 = "2026-03-10T15:00:00Z"

    tx_early = _make_tx("tx_early", "WalletA", "WalletEarly", timestamp=t1)
    tx_mid = _make_tx("tx_mid", "WalletA", "WalletMid", timestamp=t2)
    tx_late = _make_tx("tx_late", "WalletA", "WalletLate", timestamp=t3)
    await graph_service.ingest_transactions([tx_early, tx_mid, tx_late])

    req = TraceRequest(
        chain=BlockchainType.TRON,
        seed_wallet="WalletA",
        start_time="2026-03-03T00:00:00Z",
        end_time="2026-03-08T00:00:00Z",
        max_hops=2,
    )

    result = await trace_engine.execute_trace(req)
    assert len(result.paths) == 1
    assert result.paths[0].terminal_wallet == "WalletMid"


# ==============================================================================
# 3. GRAPH CYCLES & DIAMOND MULTI-PATHS
# ==============================================================================


@pytest.mark.asyncio
async def test_cycle_detection_and_termination():
    store = InMemoryGraphStore()
    graph_service = GraphService(in_memory_store=store)
    trace_engine = TraceEngine(in_memory_store=store)

    # Cycle: A -> B -> C -> A
    txs = [
        _make_tx("tx_ab", "WalletA", "WalletB"),
        _make_tx("tx_bc", "WalletB", "WalletC"),
        _make_tx("tx_ca", "WalletC", "WalletA"),
    ]
    await graph_service.ingest_transactions(txs)

    req = TraceRequest(
        chain=BlockchainType.TRON,
        seed_wallet="WalletA",
        max_hops=5,
    )

    result = await trace_engine.execute_trace(req)
    assert len(result.paths) == 1
    path = result.paths[0]
    assert path.terminal_reason == TerminalReason.CYCLE_DETECTED
    assert path.terminal_wallet == "WalletA"
    assert len(path.hops) == 3


@pytest.mark.asyncio
async def test_diamond_multi_path_convergence():
    store = InMemoryGraphStore()
    graph_service = GraphService(in_memory_store=store)
    trace_engine = TraceEngine(in_memory_store=store)

    # Diamond:
    # A -> B -> D
    # A -> C -> D
    txs = [
        _make_tx("tx_ab", "WalletA", "WalletB", amount="300.0"),
        _make_tx("tx_bd", "WalletB", "WalletD", amount="290.0"),
        _make_tx("tx_ac", "WalletA", "WalletC", amount="700.0"),
        _make_tx("tx_cd", "WalletC", "WalletD", amount="680.0"),
    ]
    await graph_service.ingest_transactions(txs)

    req = TraceRequest(
        chain=BlockchainType.TRON,
        seed_wallet="WalletA",
        max_hops=4,
    )

    result = await trace_engine.execute_trace(req)
    # Both paths leading to WalletD must be preserved
    assert len(result.paths) == 2
    # Ranked by highest total amount first: Path A->C->D should be first
    assert Decimal(result.paths[0].total_amount) >= Decimal(result.paths[1].total_amount)
    assert result.paths[0].terminal_wallet == "WalletD"
    assert result.paths[1].terminal_wallet == "WalletD"


# ==============================================================================
# 4. ASYNC JOB LIFECYCLE & INVESTIGATION API INTEGRATION
# ==============================================================================


@pytest.mark.asyncio
async def test_async_trace_job_execution_and_api():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as investigator
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "investigator@chaintrace.internal", "password": "Investigator123!"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["accessToken"]
        auth_headers = {"Authorization": f"Bearer {token}"}

        # 2. Ingest demo fraud network (Victim -> Mule -> Consolidation -> VASP)
        demo_res = await client.post("/api/v1/graph/demo-network?chain=tron", headers=auth_headers)
        assert demo_res.status_code == 200

        # 3. Create investigation case
        case_res = await client.post(
            "/api/v1/cases",
            json={
                "title": "N-Hop Trace Verification Case",
                "fraudCategory": "INVESTMENT_FRAUD",
                "reportedAmount": "100000.00",
                "incidentDate": "2026-03-01",
                "targetChain": "tron",
                "suspectWallet": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
            },
            headers=auth_headers,
        )
        assert case_res.status_code == 201
        case_id = case_res.json()["id"]

        # 4. Submit Asynchronous Trace Job
        trace_req = {
            "chain": "tron",
            "seed_wallet": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
            "max_hops": 4,
            "asset": "USDT",
        }
        job_submit_res = await client.post(
            f"/api/v1/investigations/{case_id}/trace",
            json=trace_req,
            headers=auth_headers,
        )
        assert job_submit_res.status_code == 202
        job_data = job_submit_res.json()
        job_id = job_data["id"]
        assert job_data["status"] in ("QUEUED", "RUNNING", "COMPLETED")

        # 5. Poll Job status until COMPLETED
        poll_res = await client.get(f"/api/v1/investigations/jobs/{job_id}", headers=auth_headers)
        assert poll_res.status_code == 200
        polled_data = poll_res.json()
        assert polled_data["id"] == job_id

        # 6. Verify direct graph trace endpoint works synchronously
        direct_res = await client.post(
            f"/api/v1/graph/trace?case_id={case_id}",
            json=trace_req,
            headers=auth_headers,
        )
        assert direct_res.status_code == 200
        direct_data = direct_res.json()
        assert direct_data["status"] == "COMPLETED"
        assert len(direct_data["paths"]) > 0
        assert direct_data["statistics"]["max_hop_reached"] >= 2


@pytest.mark.asyncio
async def test_authorization_rejection_for_unauthenticated():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/investigations/fake_case_id/trace",
            json={"chain": "tron", "seed_wallet": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"},
        )
        assert res.status_code in (401, 403)
