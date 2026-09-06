"""
Comprehensive Phase 1 Tests: Authentication, RBAC, Case Management, and Audit Logs
"""
import pytest
from apps.api.src.main import app
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_auth_login_success_and_failure():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Invalid credentials
        res_fail = await ac.post("/api/v1/auth/login", json={
            "email": "investigator@chaintrace.internal",
            "password": "WrongPassword123!"
        })
        assert res_fail.status_code == 401

        # Valid credentials
        res_ok = await ac.post("/api/v1/auth/login", json={
            "email": "investigator@chaintrace.internal",
            "password": "Investigator123!"
        })
        assert res_ok.status_code == 200
        data = res_ok.json()
        assert "accessToken" in data
        assert data["user"]["role"] == "INVESTIGATOR"
        assert data["user"]["email"] == "investigator@chaintrace.internal"


@pytest.mark.asyncio
async def test_case_lifecycle_and_validation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as investigator
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "investigator@chaintrace.internal",
            "password": "Investigator123!"
        })
        token = login_res.json()["accessToken"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Test Invalid Address Validation (TRON address must start with T and be 34 chars)
        bad_case = {
            "title": "Crypto Scam Investigation",
            "description": "Victim reported high-yield investment scam",
            "fraudCategory": "PIG_BUTCHERING",
            "reportedAmount": "25000",
            "currency": "USDT",
            "incidentDate": "2026-08-15",
            "targetChain": "tron",
            "suspectWallet": "InvalidTronWalletAddress123",
            "priority": "HIGH"
        }
        res_bad = await ac.post("/api/v1/cases", json=bad_case, headers=headers)
        assert res_bad.status_code == 422

        # 3. Test Valid TRON Address Creation
        valid_case = {
            "title": "Operation Red Peeling",
            "description": "Suspect wallet identified from fake exchange complaint",
            "fraudCategory": "PIG_BUTCHERING",
            "reportedAmount": "50000",
            "currency": "USDT",
            "incidentDate": "2026-09-01",
            "targetChain": "tron",
            "suspectWallet": "TJY5p7c1F4Z8n4wV6P8s3d2f1g9h7j5k3l",
            "priority": "HIGH"
        }
        res_create = await ac.post("/api/v1/cases", json=valid_case, headers=headers)
        assert res_create.status_code == 201
        case_data = res_create.json()
        assert "CT-" in case_data["caseNumber"]
        assert case_data["status"] == "ACTIVE"
        assert case_data["suspectWallet"] == "TJY5p7c1F4Z8n4wV6P8s3d2f1g9h7j5k3l"
        case_id = case_data["id"]

        # 4. List cases
        res_list = await ac.get("/api/v1/cases", headers=headers)
        assert res_list.status_code == 200
        cases = res_list.json()["cases"]
        assert any(c["id"] == case_id for c in cases)

        # 5. Get case details (reopen case)
        res_get = await ac.get(f"/api/v1/cases/{case_id}", headers=headers)
        assert res_get.status_code == 200
        assert res_get.json()["id"] == case_id

        # 6. Update case status to UNDER_REVIEW
        res_patch = await ac.patch(f"/api/v1/cases/{case_id}", json={
            "status": "UNDER_REVIEW",
            "priority": "CRITICAL"
        }, headers=headers)
        assert res_patch.status_code == 200
        updated = res_patch.json()
        assert updated["status"] == "UNDER_REVIEW"
        assert updated["priority"] == "CRITICAL"

        # 7. Verify Audit Log was generated
        res_audit = await ac.get(f"/api/v1/audit?case_id={case_id}", headers=headers)
        assert res_audit.status_code == 200
        logs = res_audit.json()["logs"]
        actions = [log["action"] for log in logs]
        assert "CASE_CREATED" in actions
        assert "CASE_VIEWED" in actions
        assert "CASE_UPDATED" in actions


@pytest.mark.asyncio
async def test_rbac_restriction_for_viewer():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Login as viewer
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "viewer@chaintrace.internal",
            "password": "ViewerSecure123!"
        })
        token = login_res.json()["accessToken"]
        headers = {"Authorization": f"Bearer {token}"}

        # Viewer attempts to create a case -> should be forbidden (403)
        case_payload = {
            "title": "Viewer Unauthorized Case",
            "fraudCategory": "OTHER",
            "reportedAmount": "1000",
            "incidentDate": "2026-09-02",
            "targetChain": "ethereum",
            "suspectWallet": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        }
        res = await ac.post("/api/v1/cases", json=case_payload, headers=headers)
        assert res.status_code == 403
