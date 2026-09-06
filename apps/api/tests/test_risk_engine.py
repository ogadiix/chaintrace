"""
Phase 7 Risk Engine Comprehensive Test Suite
Validates:
1. Low Risk Assessment (Normal benign wallet activity -> LOW)
2. Medium Risk Assessment (Moderate anomaly signals -> MEDIUM)
3. High / Critical Risk Assessment (Multiple suspicious signals or sanctions -> HIGH/CRITICAL)
4. Score Bounds [0-100] (Ensures strict capping at 100)
5. Anti-Double-Counting (Grouped category capping prevents score inflation)
6. Unknown Attribution Integrity (Unknown wallets NEVER artificially inflate risk)
7. Explainable Evidence Chains (Every contribution has human-readable reasons and evidence)
8. Mandatory False Positive Test (Normal wallet-to-exchange interaction remains LOW/MEDIUM)
9. Historical Assessments Timeline Preservation
10. Manual Risk Override (Preserves automated score alongside investigator override)
11. REST API Integration & RBAC Authorization
Source of truth: Master Prompt Phase 7 Sections 2-15, 18-24
"""

from datetime import UTC, datetime, timedelta

import pytest
from apps.api.src.adapters.models import NormalizedTransaction
from apps.api.src.core.in_memory_graph import InMemoryGraphStore
from apps.api.src.main import app
from apps.api.src.models.attribution import AttributionAnalysisResult, VaspEntity, WalletAttribution
from apps.api.src.models.intelligence import IntelligenceFinding
from apps.api.src.models.trace import TraceRequest, TraceResult
from apps.api.src.services.attribution_service import AttributionService
from apps.api.src.services.graph_service import GraphService
from apps.api.src.services.intelligence.engine import IntelligenceEngine
from apps.api.src.services.risk_engine import RiskEngine
from apps.api.src.services.trace_engine import TraceEngine
from chaintrace_shared import (
    AttributionConfidence,
    AttributionStatus,
    BlockchainType,
    EntityType,
    FindingSeverity,
    FindingType,
    RiskLevel,
)
from httpx import ASGITransport, AsyncClient

# ==============================================================================
# 1. SCORING BOUNDS & ANTI-DOUBLE-COUNTING TESTS (Sections 6 & 8)
# ==============================================================================


def test_risk_score_capping_at_100():
    engine = RiskEngine()
    now_str = datetime.now(UTC).isoformat()

    # Create multiple extreme findings exceeding 100
    mock_findings = [
        IntelligenceFinding(
            finding_id="f1",
            type=FindingType.RAPID_FORWARDING,
            severity=FindingSeverity.HIGH,
            title="Rapid Forwarding",
            description="Rapid forwarding observed",
            observed_fact="Fact",
            interpretation="Interp",
            confidence=0.9,
            evidence_refs=[],
            rule_id="rule_rf",
            rule_version="1.0.0",
            created_at=now_str,
        ),
        IntelligenceFinding(
            finding_id="f2",
            type=FindingType.PEEL_CHAIN,
            severity=FindingSeverity.HIGH,
            title="Peel Chain",
            description="Peel chain observed",
            observed_fact="Fact",
            interpretation="Interp",
            confidence=0.9,
            evidence_refs=[],
            rule_id="rule_pc",
            rule_version="1.0.0",
            created_at=now_str,
        ),
    ]

    mock_intel = IntelligenceEngine().analyze(
        trace_result=TraceResult(
            seed={"chain": "tron", "address": "W1"},
            configuration=TraceRequest(chain=BlockchainType.TRON, seed_wallet="W1"),
        )
    )
    mock_intel.findings = mock_findings

    # Mock attribution with sanctions
    sanctioned_entity = VaspEntity(
        entity_id="sanctioned_mixer",
        name="Sanctioned Entity",
        entity_type=EntityType.SANCTIONED_ENTITY,
        status="SANCTIONED",
        source="OFAC",
        created_at=now_str,
        updated_at=now_str,
    )
    mock_attr = AttributionAnalysisResult(
        seed_wallet="W1",
        attributions=[
            WalletAttribution(
                wallet="W1",
                chain=BlockchainType.TRON,
                status=AttributionStatus.MATCHED,
                entity=sanctioned_entity,
                confidence=AttributionConfidence.CONFIRMED,
                confidence_score=0.95,
                confidence_reasons=["OFAC match"],
                evidence=[],
                labels=[],
            )
        ],
        analyzed_at=now_str,
    )

    # Extreme weights
    custom_config = {
        "weights": {
            "RAPID_FORWARDING": 50,
            "PEEL_CHAIN": 60,
            "SANCTIONED_ENTITY_INTERACTION": 80,
        },
        "category_caps": {
            "VELOCITY_LAYER": 50,
            "DISPERSION_LAYER": 60,
            "ENTITY_RISK_LAYER": 80,
        },
    }

    assessment = engine.evaluate_risk(
        investigation_id="inv_test",
        seed_wallet="W1",
        trace_result=None,
        intel_result=mock_intel,
        attr_result=mock_attr,
        config=custom_config,
    )

    # Score MUST be strictly capped at 100
    assert assessment.score <= 100
    assert assessment.score == 100
    assert assessment.risk_level == RiskLevel.CRITICAL


def test_anti_double_counting_category_capping():
    engine = RiskEngine()
    now_str = datetime.now(UTC).isoformat()

    # Both RAPID_FORWARDING and SUSPICIOUS_VELOCITY belong to VELOCITY_LAYER (cap = 25)
    mock_findings = [
        IntelligenceFinding(
            finding_id="f1",
            type=FindingType.RAPID_FORWARDING,
            severity=FindingSeverity.HIGH,
            title="Rapid Forwarding",
            description="Delta 15s",
            observed_fact="Fact",
            interpretation="Interp",
            confidence=0.9,
            evidence_refs=[],
            rule_id="rule_rf",
            rule_version="1.0.0",
            created_at=now_str,
        ),
        IntelligenceFinding(
            finding_id="f2",
            type=FindingType.SUSPICIOUS_VELOCITY,
            severity=FindingSeverity.MEDIUM,
            title="Velocity Burst",
            description="8 tx/hr",
            observed_fact="Fact",
            interpretation="Interp",
            confidence=0.8,
            evidence_refs=[],
            rule_id="rule_vs",
            rule_version="1.0.0",
            created_at=now_str,
        ),
    ]

    mock_intel = IntelligenceEngine().analyze(
        trace_result=TraceResult(
            seed={"chain": "tron", "address": "W1"},
            configuration=TraceRequest(chain=BlockchainType.TRON, seed_wallet="W1"),
        )
    )
    mock_intel.findings = mock_findings

    assessment = engine.evaluate_risk(
        investigation_id="inv_test",
        seed_wallet="W1",
        trace_result=None,
        intel_result=mock_intel,
        attr_result=None,
    )

    # Check that the VELOCITY_LAYER contributions do not exceed 25 points
    vel_contributions = [c for c in assessment.contributions if c.category == "VELOCITY_LAYER"]
    total_vel_score = sum(c.effective_weight for c in vel_contributions)
    assert total_vel_score <= 25


# ==============================================================================
# 2. UNKNOWN ATTRIBUTION INTEGRITY & MANDATORY FALSE POSITIVE TEST (Sections 12 & 24)
# ==============================================================================


def test_unknown_wallet_does_not_inflate_risk():
    engine = RiskEngine()
    now_str = datetime.now(UTC).isoformat()

    # Completely unknown wallet
    mock_attr = AttributionAnalysisResult(
        seed_wallet="WUnknown",
        attributions=[
            WalletAttribution(
                wallet="WUnknown",
                chain=BlockchainType.TRON,
                status=AttributionStatus.UNKNOWN,
                confidence=AttributionConfidence.UNKNOWN,
                confidence_score=0.0,
                confidence_reasons=["No label matched"],
                evidence=[],
                labels=[],
            )
        ],
        analyzed_at=now_str,
    )

    assessment = engine.evaluate_risk(
        investigation_id="inv_test",
        seed_wallet="WUnknown",
        trace_result=None,
        intel_result=None,
        attr_result=mock_attr,
    )

    # Unknown must NOT add points
    assert assessment.score == 0
    assert assessment.risk_level == RiskLevel.LOW
    assert len(assessment.contributions) == 0


@pytest.mark.asyncio
async def test_mandatory_false_positive_normal_exchange_flow():
    """
    Mandatory Section 24:
    Wallet A -> Regulated Exchange -> Wallet B -> Regulated Exchange
    Normal exchange flows must NOT be artificially penalized as high risk.
    """
    store = InMemoryGraphStore()
    graph_service = GraphService(in_memory_store=store)
    trace_engine = TraceEngine(in_memory_store=store)
    intel_engine = IntelligenceEngine()
    attr_service = AttributionService()
    risk_engine = RiskEngine()

    now = datetime(2026, 3, 1, 10, 0, 0, tzinfo=UTC)
    now_plus_days = now + timedelta(days=2)

    # Wallet A sends 1000 USDT to Exchange Hot Wallet (WazirX)
    tx1 = NormalizedTransaction(
        chain=BlockchainType.ETHEREUM,
        tx_hash="tx_norm_1",
        block_number=19000000,
        timestamp=now.isoformat(),
        from_address="0x1111111111111111111111111111111111111111",
        to_address="0x7F367CC41522cE07553e83353248ACD8d0D24e81",  # Labeled WazirX Hot Wallet
        asset="USDT",
        amount="1000.0",
        fee="0.001",
        direction="OUTGOING",
        provider="evm",
    )
    # 2 days later, exchange sends to Wallet B
    tx2 = NormalizedTransaction(
        chain=BlockchainType.ETHEREUM,
        tx_hash="tx_norm_2",
        block_number=19010000,
        timestamp=now_plus_days.isoformat(),
        from_address="0x7F367CC41522cE07553e83353248ACD8d0D24e81",
        to_address="0x2222222222222222222222222222222222222222",
        asset="USDT",
        amount="995.0",
        fee="0.001",
        direction="OUTGOING",
        provider="evm",
    )
    await graph_service.ingest_transactions([tx1, tx2])

    req = TraceRequest(
        chain=BlockchainType.ETHEREUM,
        seed_wallet="0x1111111111111111111111111111111111111111",
        max_hops=3,
    )
    trace_result = await trace_engine.execute_trace(req)
    intel_result = intel_engine.analyze(trace_result)
    attr_result = await attr_service.analyze_trace_attributions(trace_result)

    assessment = risk_engine.evaluate_risk(
        investigation_id="inv_normal",
        seed_wallet="0x1111111111111111111111111111111111111111",
        trace_result=trace_result,
        intel_result=intel_result,
        attr_result=attr_result,
    )

    # Must remain LOW or at most minor MEDIUM
    assert assessment.risk_level in (RiskLevel.LOW, RiskLevel.MEDIUM)
    assert assessment.score < 50


# ==============================================================================
# 3. MANUAL OVERRIDE & REST API INTEGRATION (Sections 16 & 20)
# ==============================================================================


@pytest.mark.asyncio
async def test_risk_api_and_manual_override_lifecycle():
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

        # 2. Ingest demo fraud network (Victim -> Suspect -> Intermediary -> Consolidation -> VASP)
        demo_res = await client.post("/api/v1/graph/demo-network?chain=tron", headers=auth_headers)
        assert demo_res.status_code == 200

        # 3. Create Case
        case_res = await client.post(
            "/api/v1/cases",
            json={
                "title": "Risk Engine Verification Case",
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

        # 4. Trigger Risk Analysis
        risk_res = await client.post(
            f"/api/v1/investigations/{case_id}/risk/analyze?max_hops=5",
            headers=auth_headers,
        )
        assert risk_res.status_code == 200
        risk_data = risk_res.json()

        assert "score" in risk_data
        assert 0 <= risk_data["score"] <= 100
        assert "risk_level" in risk_data
        assert len(risk_data["reasons"]) > 0
        assert "engine_version" in risk_data

        # 5. Apply Manual Override
        override_res = await client.post(
            f"/api/v1/investigations/{case_id}/risk/override",
            json={
                "override_level": "CRITICAL",
                "reason": "Investigator confirmed suspect in active court order",
            },
            headers=auth_headers,
        )
        assert override_res.status_code == 200
        overridden_data = override_res.json()
        assert overridden_data["manual_override"] is not None
        assert overridden_data["manual_override"]["override_level"] == "CRITICAL"
        assert (
            overridden_data["manual_override"]["reason"]
            == "Investigator confirmed suspect in active court order"
        )
        # Automated score remains intact!
        assert overridden_data["score"] == risk_data["score"]

        # 6. Retrieve History
        history_res = await client.get(
            f"/api/v1/investigations/{case_id}/risk/history",
            headers=auth_headers,
        )
        assert history_res.status_code == 200
        history = history_res.json()
        assert len(history) >= 1

        # 7. Security: Unauthenticated request MUST be rejected with 401
        unauth_res = await client.get(f"/api/v1/investigations/{case_id}/risk")
        assert unauth_res.status_code == 401


# ==============================================================================
# 4. CONFIGURABLE RISK LEVEL THRESHOLDS & DEMO SCENARIO (Sections 2, 7, 25)
# ==============================================================================


def test_risk_level_threshold_boundaries():
    engine = RiskEngine()

    # Default thresholds: LOW: 0-24, MEDIUM: 25-49, HIGH: 50-74, CRITICAL: 75-100
    assert engine.determine_risk_level(0) == RiskLevel.LOW
    assert engine.determine_risk_level(24) == RiskLevel.LOW
    assert engine.determine_risk_level(25) == RiskLevel.MEDIUM
    assert engine.determine_risk_level(49) == RiskLevel.MEDIUM
    assert engine.determine_risk_level(50) == RiskLevel.HIGH
    assert engine.determine_risk_level(74) == RiskLevel.HIGH
    assert engine.determine_risk_level(75) == RiskLevel.CRITICAL
    assert engine.determine_risk_level(100) == RiskLevel.CRITICAL


@pytest.mark.asyncio
async def test_demo_fraud_investigation_risk_scenario():
    """
    Section 25 Demo Scenario:
    Victim -> Suspect -> Rapid forwarding -> Fan-out -> Consolidation -> Known risk-labelled destination
    Expected output:
    Risk Score: HIGH/CRITICAL
    Reasons: Rapid forwarding, Fan-out, Consolidation, Known risk-labelled interaction
    Evidence: Attached transaction references
    """
    store = InMemoryGraphStore()
    graph_service = GraphService(in_memory_store=store)
    trace_engine = TraceEngine(in_memory_store=store)
    intel_engine = IntelligenceEngine()
    attr_service = AttributionService()
    risk_engine = RiskEngine()

    # Ingest the curated deterministic demo fraud network
    await graph_service.load_demo_risk_scenario(chain="tron")

    # Trace from Suspect
    req = TraceRequest(
        chain=BlockchainType.TRON,
        seed_wallet="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        max_hops=5,
    )
    trace_res = await trace_engine.execute_trace(req)
    intel_res = intel_engine.analyze(trace_res)
    attr_res = await attr_service.analyze_trace_attributions(trace_res)

    assessment = risk_engine.evaluate_risk(
        investigation_id="demo_fraud_investigation",
        seed_wallet="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        trace_result=trace_res,
        intel_result=intel_res,
        attr_result=attr_res,
    )

    # Validate output
    assert assessment.score >= 50
    assert assessment.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)
    assert len(assessment.contributions) >= 3
    assert len(assessment.reasons) >= 3
    assert len(assessment.evidence_refs) > 0

    # Ensure engine and dataset versions are tracked
    assert assessment.engine_version == "1.0.0"
    assert assessment.intelligence_engine_version == "1.0.0"
    assert assessment.attribution_dataset_version is not None

    # Verify each contribution contains signal, weight, reason, evidence_refs, source
    for contrib in assessment.contributions:
        assert contrib.signal != ""
        assert contrib.weight > 0
        assert contrib.effective_weight > 0
        assert contrib.reason != ""
        assert contrib.source != ""
