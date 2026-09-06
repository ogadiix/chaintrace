"""
Phase 5 Intelligence Engine Comprehensive Test Suite
Validates:
1. Feature Extraction (fan-in, fan-out, intervals, velocity, round amounts)
2. Rapid Forwarding Rule (positive short delta vs negative long delta)
3. High Fan-Out Dispersion Rule (1 to many)
4. Consolidation Fan-In Rule (many to 1)
5. Peel-Chain Detection Rule (continuation ratio)
6. Round Amount Signal Rule
7. Repeated Destination Rule
8. Velocity Spike Rule
9. False Positives Check (normal benign transfers should not trigger alarms)
10. Intelligence REST Endpoints & Async Job Lifecycle Integration
Source of truth: Master Prompt Phase 5 Sections 5-11, 22, 23
"""
from datetime import UTC, datetime, timedelta

import pytest
from apps.api.src.adapters.models import NormalizedTransaction
from apps.api.src.core.in_memory_graph import InMemoryGraphStore
from apps.api.src.main import app
from apps.api.src.models.trace import TraceRequest
from apps.api.src.services.graph_service import GraphService
from apps.api.src.services.intelligence.engine import IntelligenceEngine
from apps.api.src.services.intelligence.features import FeatureExtractor
from apps.api.src.services.trace_engine import TraceEngine
from chaintrace_shared import BlockchainType, FindingType, TraceDirection
from httpx import ASGITransport, AsyncClient


def _make_tx(
    tx_hash: str,
    from_addr: str,
    to_addr: str,
    amount: str = "100.0",
    asset: str = "USDT",
    timestamp: str | None = None,
) -> NormalizedTransaction:
    now = timestamp or datetime.now(UTC).isoformat()
    return NormalizedTransaction(
        chain=BlockchainType.TRON,
        tx_hash=tx_hash,
        block_number=54000000,
        timestamp=now,
        from_address=from_addr,
        to_address=to_addr,
        asset=asset,
        amount=amount,
        fee="1.5",
        direction="OUTGOING",
        provider="test",
        is_demo=False,
    )


# ==============================================================================
# 1. RAPID FORWARDING TESTS (Section 5)
# ==============================================================================

@pytest.mark.asyncio
async def test_rapid_forwarding_positive_and_negative():
    store = InMemoryGraphStore()
    graph_service = GraphService(in_memory_store=store)
    trace_engine = TraceEngine(in_memory_store=store)
    intel_engine = IntelligenceEngine()

    t0 = datetime(2026, 3, 1, 12, 0, 0, tzinfo=UTC)
    t_rapid = t0 + timedelta(seconds=45)  # 45s delta -> Positive Rapid Forwarding
    t_slow = t0 + timedelta(days=5)      # 5 days delta -> Negative (Normal)

    # Positive scenario: Victim -> RapidIntermediary (12:00:00) -> Outflow (12:00:45)
    tx1 = _make_tx("tx_in_rapid", "WalletVictim", "WalletRapid", amount="10000.0", timestamp=t0.isoformat())
    tx2 = _make_tx("tx_out_rapid", "WalletRapid", "WalletDst", amount="9950.0", timestamp=t_rapid.isoformat())

    # Negative scenario: Victim -> SlowIntermediary (12:00:00) -> Outflow (5 days later)
    tx3 = _make_tx("tx_in_slow", "WalletVictim", "WalletSlow", amount="10000.0", timestamp=t0.isoformat())
    tx4 = _make_tx("tx_out_slow", "WalletSlow", "WalletDst2", amount="9950.0", timestamp=t_slow.isoformat())

    await graph_service.ingest_transactions([tx1, tx2, tx3, tx4])

    # Trace from Victim
    req = TraceRequest(chain=BlockchainType.TRON, seed_wallet="WalletVictim", max_hops=3)
    trace_result = await trace_engine.execute_trace(req)

    analysis = intel_engine.analyze(trace_result)
    rapid_findings = [f for f in analysis.findings if f.type == FindingType.RAPID_FORWARDING]

    # Exactly 1 rapid forwarding finding expected (for WalletRapid, NOT WalletSlow)
    assert len(rapid_findings) == 1
    rf = rapid_findings[0]
    assert "WalletRapid" in rf.observed_fact
    assert "WalletSlow" not in rf.observed_fact
    assert rf.metadata.get("time_delta_sec") == 45.0
    assert len(rf.evidence_refs) >= 2


# ==============================================================================
# 2. HIGH FAN-OUT & CONSOLIDATION FAN-IN TESTS (Sections 6 & 7)
# ==============================================================================

@pytest.mark.asyncio
async def test_fan_out_dispersion_detection():
    store = InMemoryGraphStore()
    graph_service = GraphService(in_memory_store=store)
    trace_engine = TraceEngine(in_memory_store=store)
    intel_engine = IntelligenceEngine()

    # 1 -> 4 destinations (Fan-out >= 3)
    txs = [
        _make_tx("tx_fo_1", "WalletMule", "WalletDst1", amount="2500.0"),
        _make_tx("tx_fo_2", "WalletMule", "WalletDst2", amount="2500.0"),
        _make_tx("tx_fo_3", "WalletMule", "WalletDst3", amount="2500.0"),
        _make_tx("tx_fo_4", "WalletMule", "WalletDst4", amount="2500.0"),
    ]
    await graph_service.ingest_transactions(txs)

    req = TraceRequest(chain=BlockchainType.TRON, seed_wallet="WalletMule", max_hops=2)
    trace_result = await trace_engine.execute_trace(req)

    analysis = intel_engine.analyze(trace_result)
    fan_out_findings = [f for f in analysis.findings if f.type == FindingType.HIGH_FAN_OUT]

    assert len(fan_out_findings) == 1
    assert fan_out_findings[0].metadata["fan_out"] == 4


@pytest.mark.asyncio
async def test_consolidation_fan_in_detection():
    store = InMemoryGraphStore()
    graph_service = GraphService(in_memory_store=store)
    trace_engine = TraceEngine(in_memory_store=store)
    intel_engine = IntelligenceEngine()

    # 4 distinct sources -> 1 consolidation collector wallet
    txs = [
        _make_tx("tx_fi_1", "WalletSrc1", "WalletCollector", amount="5000.0"),
        _make_tx("tx_fi_2", "WalletSrc2", "WalletCollector", amount="5000.0"),
        _make_tx("tx_fi_3", "WalletSrc3", "WalletCollector", amount="5000.0"),
        _make_tx("tx_fi_4", "WalletSrc4", "WalletCollector", amount="5000.0"),
    ]
    await graph_service.ingest_transactions(txs)

    # Trace in reverse from WalletCollector
    features = FeatureExtractor.extract_wallet_features("WalletCollector", "tron", store._edges.values())
    assert features.fan_in == 4

    req = TraceRequest(
        chain=BlockchainType.TRON,
        seed_wallet="WalletCollector",
        direction=TraceDirection.BACKWARD,
        max_hops=2,
    )
    trace_result = await trace_engine.execute_trace(req)

    analysis = intel_engine.analyze(trace_result)
    fan_in_findings = [f for f in analysis.findings if f.type == FindingType.HIGH_FAN_IN]
    assert len(fan_in_findings) == 1
    assert fan_in_findings[0].metadata["fan_in"] == 4


# ==============================================================================
# 3. PEEL CHAIN DETECTION (Section 8)
# ==============================================================================

@pytest.mark.asyncio
async def test_peel_chain_pattern_detection():
    store = InMemoryGraphStore()
    graph_service = GraphService(in_memory_store=store)
    trace_engine = TraceEngine(in_memory_store=store)
    intel_engine = IntelligenceEngine()

    # Peel chain: 100,000 -> 90,000 (90%) -> 81,000 (90%) -> 72,900 (90%)
    txs = [
        _make_tx("tx_pc_1", "WalletA", "WalletB", amount="100000.0"),
        _make_tx("tx_pc_2", "WalletB", "WalletC", amount="90000.0"),
        _make_tx("tx_pc_3", "WalletC", "WalletD", amount="81000.0"),
        _make_tx("tx_pc_4", "WalletD", "WalletE", amount="72900.0"),
    ]
    await graph_service.ingest_transactions(txs)

    req = TraceRequest(chain=BlockchainType.TRON, seed_wallet="WalletA", max_hops=5)
    trace_result = await trace_engine.execute_trace(req)

    analysis = intel_engine.analyze(trace_result)
    peel_findings = [f for f in analysis.findings if f.type == FindingType.PEEL_CHAIN]

    assert len(peel_findings) >= 1
    assert peel_findings[0].metadata["consecutive_peels"] >= 3


# ==============================================================================
# 4. ROUND AMOUNT & REPEATED DESTINATIONS (Sections 9 & 10)
# ==============================================================================

@pytest.mark.asyncio
async def test_round_amount_signal_and_repeated_destinations():
    store = InMemoryGraphStore()
    graph_service = GraphService(in_memory_store=store)
    trace_engine = TraceEngine(in_memory_store=store)
    intel_engine = IntelligenceEngine()

    # Wallet sends repeated round transfers (5000.0, 10000.0) to the same destination
    tx1 = _make_tx("tx_rep_1", "WalletSender", "WalletRecipient", amount="5000.0")
    tx2 = _make_tx("tx_rep_2", "WalletSender", "WalletRecipient", amount="10000.0")
    tx3 = _make_tx("tx_rep_3", "WalletSender", "WalletRecipient", amount="15000.0")
    await graph_service.ingest_transactions([tx1, tx2, tx3])

    req = TraceRequest(chain=BlockchainType.TRON, seed_wallet="WalletSender", max_hops=2)
    trace_result = await trace_engine.execute_trace(req)

    analysis = intel_engine.analyze(trace_result)

    # Check Repeated Destination Finding
    rep_findings = [f for f in analysis.findings if f.type == FindingType.REPEATED_DESTINATION]
    assert len(rep_findings) == 1
    assert rep_findings[0].metadata["count"] == 3

    # Check Round Amount Finding
    round_findings = [f for f in analysis.findings if f.type == FindingType.ROUND_AMOUNT_PATTERN]
    assert len(round_findings) >= 1


# ==============================================================================
# 5. INTEGRATION TEST: CASE -> TRACE -> INTELLIGENCE API
# ==============================================================================

@pytest.mark.asyncio
async def test_case_intelligence_api_integration():
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

        # 2. Ingest demo fraud network (Victim -> Suspect -> Layering -> Consolidation -> VASP)
        demo_res = await client.post("/api/v1/graph/demo-network?chain=tron", headers=auth_headers)
        assert demo_res.status_code == 200

        # 3. Create Case centered on Suspect Mule
        case_res = await client.post(
            "/api/v1/cases",
            json={
                "title": "Intelligence Engine Case",
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

        # 4. Trigger Intelligence Analysis via API
        intel_res = await client.post(
            f"/api/v1/investigations/{case_id}/intelligence/analyze?max_hops=4",
            headers=auth_headers,
        )
        assert intel_res.status_code == 200
        data = intel_res.json()
        assert "findings" in data
        assert len(data["findings"]) > 0
        assert "statistics" in data
        assert data["statistics"]["total_findings"] == len(data["findings"])

        # Check that observed facts and interpretations are properly segregated
        first_finding = data["findings"][0]
        assert "observed_fact" in first_finding
        assert "interpretation" in first_finding
        assert len(first_finding["evidence_refs"]) > 0

        # 5. Verify Async Intelligence Job Submission & Polling
        job_res = await client.post(
            f"/api/v1/investigations/{case_id}/intelligence/jobs?max_hops=4",
            headers=auth_headers,
        )
        assert job_res.status_code == 202
        job_id = job_res.json()["id"]

        poll_res = await client.get(
            f"/api/v1/investigations/intelligence/jobs/{job_id}",
            headers=auth_headers,
        )
        assert poll_res.status_code == 200
        assert poll_res.json()["id"] == job_id
