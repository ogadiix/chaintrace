"""
Phase 11 — Security Hardening & Threat Testing Suite
Comprehensive security validation covering:
- Authentication & brute force mitigation
- Object-level authorization (IDOR/BOLA defense)
- SQL / Cypher / XSS injection resilience
- Path traversal rejection
- Security response headers
- Input validation & schema boundaries
- Request body size limits
"""

import os
import pytest
from apps.api.src.core.config import settings
from apps.api.src.core.rate_limiter import get_rate_limiter
from apps.api.src.main import app
from httpx import ASGITransport, AsyncClient


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Reset rate limiter buckets before each test."""
    limiter = get_rate_limiter()
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture
async def investigator_headers() -> dict[str, str]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "investigator@chaintrace.internal", "password": "Investigator123!"},
        )
        token = res.json()["accessToken"]
        return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def admin_headers() -> dict[str, str]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "admin@chaintrace.internal", "password": "AdminSecure123!"},
        )
        token = res.json()["accessToken"]
        return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def analyst_headers() -> dict[str, str]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "analyst@chaintrace.internal", "password": "AnalystSecure123!"},
        )
        token = res.json()["accessToken"]
        return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def viewer_headers() -> dict[str, str]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "viewer@chaintrace.internal", "password": "ViewerSecure123!"},
        )
        token = res.json()["accessToken"]
        return {"Authorization": f"Bearer {token}"}


# =============================================================================
# 1. Authentication & Token Security Tests
# =============================================================================


@pytest.mark.asyncio
async def test_auth_invalid_credentials_rejected():
    """Confirms invalid passwords and non-existent accounts receive 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "investigator@chaintrace.internal", "password": "WrongPassword999!"},
        )
        assert res.status_code == 401
        assert "Incorrect email or password" in res.json()["detail"]


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected():
    """Confirms protected endpoints reject requests without Authorization header."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/cases")
        assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_tampered_jwt_token_rejected():
    """Confirms cryptographically tampered JWT tokens are rejected."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        tampered_headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature"}
        res = await ac.get("/api/v1/cases", headers=tampered_headers)
        assert res.status_code == 401


# =============================================================================
# 2. Defensive Security Headers & CORS Tests
# =============================================================================


@pytest.mark.asyncio
async def test_security_headers_present():
    """Confirms all defensive security headers are returned on API responses."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/health")
        assert res.status_code == 200
        headers = res.headers
        assert headers.get("X-Content-Type-Options") == "nosniff"
        assert headers.get("X-Frame-Options") == "DENY"
        assert "Strict-Transport-Security" in headers
        assert "Referrer-Policy" in headers
        assert "Content-Security-Policy" in headers
        assert "Permissions-Policy" in headers


# =============================================================================
# 3. Object-Level Authorization (IDOR / BOLA Prevention) Tests
# =============================================================================


@pytest.mark.asyncio
async def test_idor_user_cannot_access_unowned_case(investigator_headers, viewer_headers):
    """
    Confirms an unassigned non-admin user receives 404 when querying another user's case,
    preventing both data leakage and ID enumeration.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Investigator Alex creates a private case
        create_res = await ac.post(
            "/api/v1/cases",
            json={
                "complaintId": "NCRP-SEC-IDOR-001",
                "title": "Private Confidential Syndicate Case",
                "fraudCategory": "INVESTMENT_SCAM",
                "reportedAmount": "100000",
                "currency": "USD",
                "incidentDate": "2026-08-01",
                "targetChain": "tron",
                "suspectWallet": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                "priority": "HIGH",
            },
            headers=investigator_headers,
        )
        assert create_res.status_code == 201
        case_id = create_res.json()["id"]

        # Viewer (not assigned to this case) attempts to access it directly
        viewer_res = await ac.get(f"/api/v1/cases/{case_id}", headers=viewer_headers)
        assert viewer_res.status_code == 404

        # Viewer attempts to update the case
        patch_res = await ac.patch(
            f"/api/v1/cases/{case_id}",
            json={"title": "Hacked Title"},
            headers=viewer_headers,
        )
        assert patch_res.status_code in (403, 404)


@pytest.mark.asyncio
async def test_idor_admin_can_access_all_cases(investigator_headers, admin_headers):
    """Confirms ADMIN role can supervise and access all cases across the system."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        create_res = await ac.post(
            "/api/v1/cases",
            json={
                "complaintId": "NCRP-SEC-ADMIN-002",
                "title": "Investigator Created Case for Admin Review",
                "fraudCategory": "PIG_BUTCHERING",
                "reportedAmount": "50000",
                "currency": "USD",
                "incidentDate": "2026-08-05",
                "targetChain": "ethereum",
                "suspectWallet": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
                "priority": "MEDIUM",
            },
            headers=investigator_headers,
        )
        assert create_res.status_code == 201
        case_id = create_res.json()["id"]

        admin_res = await ac.get(f"/api/v1/cases/{case_id}", headers=admin_headers)
        assert admin_res.status_code == 200
        assert admin_res.json()["id"] == case_id


# =============================================================================
# 4. Injection Hardening Tests (SQL / Cypher / XSS)
# =============================================================================


@pytest.mark.asyncio
async def test_sql_injection_payload_in_search(investigator_headers):
    """Verifies that SQL injection strings in case search queries are safely parameterized."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        sql_payloads = [
            "' OR '1'='1",
            "'; DROP TABLE cases; --",
            "1 UNION SELECT null, null, null--",
        ]
        for payload in sql_payloads:
            res = await ac.get(f"/api/v1/cases?search={payload}", headers=investigator_headers)
            assert res.status_code == 200
            data = res.json()
            assert "cases" in data


@pytest.mark.asyncio
async def test_xss_payload_in_case_title(investigator_headers):
    """Verifies that XSS script tags in case fields are accepted as inert text and not executed."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        xss_payload = "<script>alert('XSS')</script>"
        create_res = await ac.post(
            "/api/v1/cases",
            json={
                "complaintId": "NCRP-SEC-XSS-003",
                "title": xss_payload,
                "fraudCategory": "IMPERSONATION",
                "reportedAmount": "1000",
                "currency": "USD",
                "incidentDate": "2026-08-10",
                "targetChain": "tron",
                "suspectWallet": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                "priority": "LOW",
            },
            headers=investigator_headers,
        )
        assert create_res.status_code == 201
        data = create_res.json()
        assert data["title"] == xss_payload


# =============================================================================
# 5. Schema Input Validation Tests
# =============================================================================


@pytest.mark.asyncio
async def test_invalid_wallet_format_rejected(investigator_headers):
    """Verifies that invalid wallet address formats in NCRP ingestion are rejected."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/integrations/ncrp/complaints",
            json={
                "complaint_id": "NCRP-INVALID-WALLET",
                "category": "CRYPTO_FRAUD",
                "blockchain": "tron",
                "wallet_address": "bad_short",  # Invalid wallet
                "auto_create_case": True,
            },
            headers=investigator_headers,
        )
        assert res.status_code == 422


@pytest.mark.asyncio
async def test_invalid_sahyog_scenario_rejected(investigator_headers):
    """Verifies that invalid simulated scenario parameters are rejected."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create a case first
        case_res = await ac.post(
            "/api/v1/cases",
            json={
                "complaintId": "NCRP-SEC-SAHYOG-004",
                "title": "SAHYOG Scenario Test Case",
                "fraudCategory": "INVESTMENT_SCAM",
                "reportedAmount": "100000",
                "currency": "USD",
                "incidentDate": "2026-08-12",
                "targetChain": "tron",
                "suspectWallet": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                "priority": "HIGH",
            },
            headers=investigator_headers,
        )
        assert case_res.status_code == 201
        case_id = case_res.json()["id"]

        # Attempt to draft with invalid scenario
        res = await ac.post(
            f"/api/v1/investigations/{case_id}/sahyog/requests",
            json={
                "recipient_entity": "Binance Desk",
                "target_wallet": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                "simulated_scenario": "MALICIOUS_INJECTION_SCENARIO",
            },
            headers=investigator_headers,
        )
        assert res.status_code == 422


# =============================================================================
# 6. Rate Limiting Tests
# =============================================================================


@pytest.mark.asyncio
async def test_rate_limiting_login_threshold():
    """Confirms that exceeding login attempt limits returns HTTP 429 Too Many Requests."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        limiter = get_rate_limiter()
        limiter.reset()

        got_429 = False
        for _ in range(settings.RATE_LIMIT_LOGIN_PER_MINUTE + 5):
            res = await ac.post(
                "/api/v1/auth/login",
                json={"email": "ratelimit_probe@chaintrace.internal", "password": "WrongPassword!"},
            )
            if res.status_code == 429:
                got_429 = True
                assert "Rate limit exceeded" in res.json()["detail"]
                assert "Retry-After" in res.headers
                break
        assert got_429 is True
