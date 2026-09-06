"""
Phase 6 VASP Attribution Comprehensive Test Suite
Validates:
1. Exact Match Attribution (known wallet -> MATCHED with provenance)
2. Unknown Wallets (unrecognized address -> UNKNOWN, never fabricated)
3. Cross-Chain Identity Separation (same hex on Ethereum vs BSC/TRON)
4. Conflicting Labels Handling (Source A vs Source B -> CONFLICTING_LABELS)
5. Path Endpoint Attribution (traced endpoint -> attributed to VASP)
6. Sanctioned Entity Attribution (OFAC designated addresses)
7. REST API Endpoints & RBAC Authorization
Source of truth: Master Prompt Phase 6 Sections 8-14, 23, 24
"""

from datetime import UTC, datetime

import pytest
from apps.api.src.main import app
from apps.api.src.models.attribution import VaspEntity, WalletLabel
from apps.api.src.services.attribution_service import AttributionService
from chaintrace_shared import (
    AttributionConfidence,
    AttributionStatus,
    BlockchainType,
    EntityType,
)
from httpx import ASGITransport, AsyncClient

# ==============================================================================
# 1. EXACT MATCH & UNKNOWN ATTRIBUTION TESTS (Sections 8 & 13)
# ==============================================================================


@pytest.mark.asyncio
async def test_exact_match_attribution_with_provenance():
    service = AttributionService()
    await service.initialize()

    # Known seed wallet: Binance Hot Wallet on Ethereum
    binance_eth = "0x28C6c06298d514Db089934071355E5743bf21d60"
    attr = await service.attribute_wallet(chain="ethereum", address=binance_eth)

    assert attr.status == AttributionStatus.MATCHED
    assert attr.entity is not None
    assert attr.entity.name == "Binance 14 Hot Wallet"
    assert attr.entity.entity_type == EntityType.EXCHANGE
    assert attr.confidence in (AttributionConfidence.CONFIRMED, AttributionConfidence.PROBABLE)
    assert attr.confidence_score >= 0.85
    assert len(attr.evidence) > 0
    assert attr.evidence[0]["source"] == "PUBLIC_DISCLOSURE"


@pytest.mark.asyncio
async def test_unknown_wallet_never_forces_attribution():
    service = AttributionService()
    await service.initialize()

    # Arbitrary unlabeled address
    unknown_addr = "0x000000000000000000000000000000000000dead"
    attr = await service.attribute_wallet(chain="ethereum", address=unknown_addr)

    assert attr.status == AttributionStatus.UNKNOWN
    assert attr.entity is None
    assert attr.confidence == AttributionConfidence.UNKNOWN
    assert attr.confidence_score == 0.0
    assert "No supported public or curated label matched" in attr.confidence_reasons[0]


# ==============================================================================
# 2. MULTI-CHAIN SEPARATION & SANCTIONS (Sections 5 & 18)
# ==============================================================================


@pytest.mark.asyncio
async def test_cross_chain_address_isolation():
    service = AttributionService()
    await service.initialize()

    # Address: 0x8894E0a0c962CB723c1976a4421c95949bE2D4E3 is labeled on BSC
    # If queried on Ethereum, it MUST return UNKNOWN!
    addr = "0x8894E0a0c962CB723c1976a4421c95949bE2D4E3"
    attr_bsc = await service.attribute_wallet(chain="bsc", address=addr)
    attr_eth = await service.attribute_wallet(chain="ethereum", address=addr)

    assert attr_bsc.status == AttributionStatus.MATCHED
    assert attr_bsc.entity.name == "Binance Hot Wallet BSC"

    assert attr_eth.status == AttributionStatus.UNKNOWN
    assert attr_eth.entity is None


@pytest.mark.asyncio
async def test_sanctioned_entity_classification():
    service = AttributionService()
    await service.initialize()

    # Tornado Cash Router on OFAC list
    tornado_router = "0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c"
    attr = await service.attribute_wallet(chain="ethereum", address=tornado_router)

    assert attr.status == AttributionStatus.MATCHED
    assert attr.entity.entity_type == EntityType.SANCTIONED_ENTITY
    assert attr.labels[0].source == "OFAC"
    assert attr.confidence == AttributionConfidence.CONFIRMED


# ==============================================================================
# 3. CONFLICTING LABELS HANDLING (Section 7)
# ==============================================================================


@pytest.mark.asyncio
async def test_conflicting_labels_preservation():
    service = AttributionService()
    await service.initialize()

    conflict_addr = "0x3333333333333333333333333333333333333333"

    # Source A claims Exchange A
    entity_a = VaspEntity(
        entity_id="exchange_alpha",
        name="Exchange Alpha",
        entity_type=EntityType.EXCHANGE,
        status="ACTIVE",
        source="SOURCE_ALPHA",
        confidence=AttributionConfidence.PROBABLE,
        created_at=datetime.now(UTC).isoformat(),
        updated_at=datetime.now(UTC).isoformat(),
    )
    label_a = WalletLabel(
        chain=BlockchainType.ETHEREUM,
        address=conflict_addr,
        entity_id="exchange_alpha",
        source="SOURCE_ALPHA",
        confidence=AttributionConfidence.PROBABLE,
    )

    # Source B claims Exchange B
    entity_b = VaspEntity(
        entity_id="exchange_beta",
        name="Exchange Beta",
        entity_type=EntityType.EXCHANGE,
        status="ACTIVE",
        source="SOURCE_BETA",
        confidence=AttributionConfidence.PROBABLE,
        created_at=datetime.now(UTC).isoformat(),
        updated_at=datetime.now(UTC).isoformat(),
    )
    label_b = WalletLabel(
        chain=BlockchainType.ETHEREUM,
        address=conflict_addr,
        entity_id="exchange_beta",
        source="SOURCE_BETA",
        confidence=AttributionConfidence.PROBABLE,
    )

    await service.add_label(label_a, entity_a)
    await service.add_label(label_b, entity_b)

    attr = await service.attribute_wallet(chain="ethereum", address=conflict_addr)

    # Must preserve disagreement as CONFLICTING_LABELS
    assert attr.status == AttributionStatus.CONFLICTING_LABELS
    assert len(attr.labels) == 2
    assert "Conflicting labels detected" in attr.confidence_reasons[0]


# ==============================================================================
# 4. PATH ENDPOINT ATTRIBUTION & REST API INTEGRATION
# ==============================================================================


@pytest.mark.asyncio
async def test_path_endpoint_vasp_attribution_integration():
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

        # 2. Ingest deterministic 5-hop demo network
        # Hop 5 terminates at TVaspBinanceDepositHotWallet88888888
        demo_res = await client.post("/api/v1/graph/demo-network?chain=tron", headers=auth_headers)
        assert demo_res.status_code == 200

        # 3. Create Case
        case_res = await client.post(
            "/api/v1/cases",
            json={
                "title": "VASP Attribution Case",
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

        # 4. Execute Case Attribution Analysis via API
        attr_res = await client.post(
            f"/api/v1/investigations/{case_id}/attribution/analyze?max_hops=5",
            headers=auth_headers,
        )
        assert attr_res.status_code == 200
        data = attr_res.json()

        assert data["matched_count"] >= 1
        assert "terminal_attributions" in data
        assert len(data["terminal_attributions"]) > 0

        # Verify terminal destination matches the demo VASP
        matched_terminals = [
            t
            for t in data["terminal_attributions"]
            if t["wallet"] == "TVaspBinanceDepositHotWallet88888888"
        ]
        assert len(matched_terminals) == 1
        vasp_match = matched_terminals[0]
        assert vasp_match["status"] == "MATCHED"
        assert vasp_match["entity"]["name"] == "Binance Exchange"
        assert vasp_match["attributed_via"] == "PATH_ENDPOINT"
        assert vasp_match["confidence"] == "CONFIRMED"

        # 5. Direct single wallet attribution endpoint
        single_res = await client.get(
            "/api/v1/attribution/wallet/tron/TVaspBinanceDepositHotWallet88888888",
            headers=auth_headers,
        )
        assert single_res.status_code == 200
        single_data = single_res.json()
        assert single_data["status"] == "MATCHED"
        assert single_data["entity"]["name"] == "Binance Exchange"
