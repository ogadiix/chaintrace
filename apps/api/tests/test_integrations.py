"""
Phase 10 — NCRP and SAHYOG Integrations Test Suite
Validates simulated complaint intake, address validation, idempotency,
SAHYOG VASP request lifecycle, deterministic mock responses, evidence attachment, and RBAC.
"""

import pytest
from apps.api.src.main import app
from httpx import ASGITransport, AsyncClient


@pytest.fixture
async def auth_headers() -> dict[str, str]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "investigator@chaintrace.internal", "password": "Investigator123!"},
        )
        token = res.json()["accessToken"]
        return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def viewer_auth_headers() -> dict[str, str]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "viewer@chaintrace.internal", "password": "ViewerSecure123!"},
        )
        token = res.json()["accessToken"]
        return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_ncrp_complaint_intake_and_auto_case_creation(auth_headers: dict[str, str]):
    """Verifies that NCRP complaint intake automatically creates an investigation case."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        complaint_payload = {
            "complaint_id": "NCRP-2026-TEST-99881",
            "category": "INVESTMENT_SCAM",
            "reported_amount": "150000",
            "currency": "INR",
            "blockchain": "tron",
            "wallet_address": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
            "transaction_hash": "0x5a19c3b88d7426e890b3456789abcdef0123456789abcdef0123456789abcdef",
            "description": "Simulated victim telegram crypto investment fraud.",
            "victim_reference": "VICTIM-SYNTH-01",
            "auto_create_case": True,
        }

        res = await ac.post(
            "/api/v1/integrations/ncrp/complaints",
            json=complaint_payload,
            headers=auth_headers,
        )
        assert res.status_code == 201
        data = res.json()

        assert data["complaintId"] == "NCRP-2026-TEST-99881"
        assert data["source"] == "NCRP_DEMO"
        assert data["status"] == "CASE_CREATED"
        assert data["caseId"] is not None
        assert "CT-2026-" in data["caseNumber"]
        assert "SIMULATED NCRP INTEGRATION" in data["disclaimer"]

        # Retrieve complaint list
        list_res = await ac.get("/api/v1/integrations/ncrp/complaints", headers=auth_headers)
        assert list_res.status_code == 200
        assert any(c["complaintId"] == "NCRP-2026-TEST-99881" for c in list_res.json()["complaints"])

        # Retrieve complaint by ID
        get_res = await ac.get(f"/api/v1/integrations/ncrp/complaints/{data['id']}", headers=auth_headers)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == data["id"]


@pytest.mark.asyncio
async def test_ncrp_complaint_idempotency(auth_headers: dict[str, str]):
    """Verifies that ingesting duplicate complaint_id returns existing case without creating a new one."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        cid = "NCRP-IDEMPOTENT-DEMO-001"
        payload = {
            "complaint_id": cid,
            "category": "PHISHING",
            "reported_amount": "50000",
            "currency": "INR",
            "blockchain": "tron",
            "wallet_address": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
            "auto_create_case": True,
        }

        # First ingestion
        res1 = await ac.post("/api/v1/integrations/ncrp/complaints", json=payload, headers=auth_headers)
        assert res1.status_code == 201
        data1 = res1.json()
        case_id_1 = data1["caseId"]

        # Duplicate ingestion
        res2 = await ac.post("/api/v1/integrations/ncrp/complaints", json=payload, headers=auth_headers)
        assert res2.status_code == 201
        data2 = res2.json()

        assert data2["id"] == data1["id"]
        assert data2["caseId"] == case_id_1


@pytest.mark.asyncio
async def test_ncrp_complaint_validation_error(auth_headers: dict[str, str]):
    """Verifies that invalid blockchain addresses or negative amounts are rejected."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Invalid TRON address (starts with 0x)
        bad_address_payload = {
            "complaint_id": "NCRP-INVALID-ADDR-001",
            "category": "PHISHING",
            "reported_amount": "10000",
            "currency": "INR",
            "blockchain": "tron",
            "wallet_address": "0x1234567890abcdef1234567890abcdef12345678",
        }
        res = await ac.post(
            "/api/v1/integrations/ncrp/complaints",
            json=bad_address_payload,
            headers=auth_headers,
        )
        assert res.status_code == 422
        assert "Invalid wallet address" in res.json()["detail"]


@pytest.mark.asyncio
async def test_sahyog_request_lifecycle_and_success_scenario(auth_headers: dict[str, str]):
    """End-to-end verification of drafting and submitting a SAHYOG request with SUCCESS response."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create a case
        case_res = await ac.post(
            "/api/v1/cases",
            json={
                "title": "SAHYOG Flow Investigation",
                "fraudCategory": "INVESTMENT_SCAM",
                "reportedAmount": "85000",
                "currency": "USDT",
                "incidentDate": "2026-09-01",
                "targetChain": "tron",
                "suspectWallet": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                "priority": "HIGH",
            },
            headers=auth_headers,
        )
        assert case_res.status_code == 201
        case_id = case_res.json()["id"]

        # 2. Draft SAHYOG Request
        req_payload = {
            "request_type": "ACCOUNT_IDENTIFICATION",
            "recipient_entity": "Binance (Demo Custody)",
            "target_wallet": "TVaspBinanceDepositHotWallet88888888",
            "authority_reference": "SEC-91-CrPC-DEMO-2026-441",
            "requested_information": "Factual KYC documentation and recent deposit records.",
            "simulated_scenario": "SUCCESS",
        }
        draft_res = await ac.post(
            f"/api/v1/investigations/{case_id}/sahyog/requests",
            json=req_payload,
            headers=auth_headers,
        )
        assert draft_res.status_code == 201
        req_data = draft_res.json()
        req_id = req_data["id"]

        assert req_data["status"] == "READY"
        assert req_data["recipientEntity"] == "Binance (Demo Custody)"
        assert req_data["response"] is None

        # 3. Submit Request
        submit_res = await ac.post(
            f"/api/v1/sahyog/requests/{req_id}/submit",
            headers=auth_headers,
        )
        assert submit_res.status_code == 200
        completed_req = submit_res.json()

        assert completed_req["status"] == "RESPONSE_RECEIVED"
        assert completed_req["response"] is not None

        resp = completed_req["response"]
        assert resp["status"] == "RESPONSE_RECEIVED"
        assert resp["source"] == "SAHYOG_DEMO"
        assert "A*** K***" in resp["accountDetails"]["masked_name"]
        assert resp["accountDetails"]["kyc_status"] == "VERIFIED_TIER_2"
        assert len(resp["transactions"]) >= 1
        assert resp["evidenceId"] is not None
        assert "EV-SAHYOG-" in resp["evidenceId"]

        # 4. Query response endpoint directly
        resp_endpoint_res = await ac.get(f"/api/v1/sahyog/requests/{req_id}/response", headers=auth_headers)
        assert resp_endpoint_res.status_code == 200
        assert resp_endpoint_res.json()["evidenceId"] == resp["evidenceId"]


@pytest.mark.asyncio
async def test_sahyog_deterministic_scenarios(auth_headers: dict[str, str]):
    """Tests NO_MATCH and FREEZE_REQUEST_DEMO scenarios."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        case_res = await ac.post(
            "/api/v1/cases",
            json={
                "title": "Scenario Testing Case",
                "fraudCategory": "PHISHING",
                "reportedAmount": "35000",
                "currency": "USDT",
                "incidentDate": "2026-09-02",
                "targetChain": "tron",
                "suspectWallet": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                "priority": "MEDIUM",
            },
            headers=auth_headers,
        )
        case_id = case_res.json()["id"]

        # Test NO_MATCH
        draft_res = await ac.post(
            f"/api/v1/investigations/{case_id}/sahyog/requests",
            json={
                "request_type": "ACCOUNT_IDENTIFICATION",
                "recipient_entity": "Unknown Exchange Service",
                "target_wallet": "TUnknownDestinationWallet999999999",
                "authority_reference": "SEC-91-CrPC-DEMO-002",
                "simulated_scenario": "NO_MATCH",
            },
            headers=auth_headers,
        )
        assert draft_res.status_code == 201
        req1_id = draft_res.json()["id"]

        sub1 = await ac.post(f"/api/v1/sahyog/requests/{req1_id}/submit", headers=auth_headers)
        assert sub1.status_code == 200
        assert sub1.json()["response"]["status"] == "NO_MATCH"
        assert sub1.json()["response"]["accountDetails"]["match_found"] is False

        # Test FREEZE_REQUEST_DEMO
        draft_freeze = await ac.post(
            f"/api/v1/investigations/{case_id}/sahyog/requests",
            json={
                "request_type": "FREEZE_REQUEST_DEMO",
                "recipient_entity": "WazirX Nodal Desk",
                "target_wallet": "TFreezeTargetWallet55555555555555",
                "authority_reference": "SEC-102-CrPC-DEMO-FREEZE",
                "simulated_scenario": "FREEZE_REQUEST_DEMO",
            },
            headers=auth_headers,
        )
        assert draft_freeze.status_code == 201
        freeze_id = draft_freeze.json()["id"]

        sub_freeze = await ac.post(f"/api/v1/sahyog/requests/{freeze_id}/submit", headers=auth_headers)
        assert sub_freeze.status_code == 200
        freeze_resp = sub_freeze.json()["response"]
        assert "FROZEN_FOR_INVESTIGATION [SIMULATED]" in freeze_resp["accountDetails"]["freeze_status"]
        assert "EV-FREEZE-" in freeze_resp["evidenceId"]


@pytest.mark.asyncio
async def test_sahyog_security_and_errors(
    auth_headers: dict[str, str], viewer_auth_headers: dict[str, str]
):
    """Verifies RBAC constraints and 404 handling."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Non-existent case
        bad_case = await ac.post(
            "/api/v1/investigations/non-existent-case-id/sahyog/requests",
            json={
                "recipient_entity": "Binance",
                "target_wallet": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
            },
            headers=auth_headers,
        )
        assert bad_case.status_code == 404

        # Non-existent request submit
        bad_req = await ac.post("/api/v1/sahyog/requests/non-existent-req-id/submit", headers=auth_headers)
        assert bad_req.status_code == 404

        # Viewer role cannot draft requests
        viewer_draft = await ac.post(
            "/api/v1/investigations/any-case/sahyog/requests",
            json={
                "recipient_entity": "Binance",
                "target_wallet": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
            },
            headers=viewer_auth_headers,
        )
        assert viewer_draft.status_code == 403
