"""
Phase 9 — Investigation Reports Test Suite
Validates PDF dossier compilation, ReportLab formatting, cryptographic verification,
sequential versioning, RBAC, and secure download streaming.
"""

import os
from typing import Any

import pytest
from apps.api.src.main import app
from apps.api.src.services.report_generator import ReportGenerator
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


class MockCase:
    def __init__(self) -> None:
        self.id = "mock-case-1234"
        self.case_number = "CT-2026-0099"
        self.title = "Phishing Syndicate Drainer"
        self.complaint_id = "NCRP-2026-9999"
        self.fraud_category = "INVESTMENT_SCAM"
        self.reported_amount = "250000"
        self.currency = "USDT"
        self.status = "ACTIVE"
        self.priority = "HIGH"
        self.incident_date = "2026-08-15"
        self.target_chain = "tron"
        self.suspect_wallet = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
        self.initial_tx_hash = "0x9876543210abcdef0123456789abcdef0123456789abcdef0123456789abcdef"


def test_report_generator_direct(tmp_path: Any):
    """Verifies that ReportGenerator directly generates a valid PDF with correct signature."""
    generator = ReportGenerator()
    case = MockCase()
    output_file = str(tmp_path / "test_report.pdf")

    meta = {
        "report_id": "test-uuid-001",
        "report_number": "REP-CT-2026-0099-V1.0",
        "version": "1.0",
        "created_at": "2026-09-06 12:00 UTC",
        "investigator_name": "Senior Investigator John Doe",
        "options": {"include_tx_appendix": True, "max_appendix_txs": 10},
    }

    result = generator.generate(
        case=case,
        trace_result=None,
        intel_result=None,
        attr_result=None,
        risk_assessment=None,
        report_meta=meta,
        output_path=output_file,
    )

    assert os.path.exists(output_file)
    assert result["file_size_bytes"] > 1000
    assert len(result["sha256_hash"]) == 64

    # Verify standard PDF header magic bytes
    with open(output_file, "rb") as f:
        header = f.read(5)
        assert header == b"%PDF-"


@pytest.mark.asyncio
async def test_report_lifecycle_api(auth_headers: dict[str, str]):
    """End-to-end test of report creation, listing, retrieval, versioning, and download."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create a Case
        case_payload = {
            "title": "Operation Cyber Vault Report Test",
            "complaintId": "NCRP-TEST-2026-01",
            "fraudCategory": "INVESTMENT_SCAM",
            "reportedAmount": "75000",
            "currency": "USDT",
            "incidentDate": "2026-09-01",
            "targetChain": "tron",
            "suspectWallet": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
            "initialTxHash": "0xaabbccdd11223344556677889900aabbccdd11223344556677889900aabbccdd",
            "priority": "HIGH",
        }
        create_case_res = await ac.post("/api/v1/cases", json=case_payload, headers=auth_headers)
        assert create_case_res.status_code == 201
        case_data = create_case_res.json()
        case_id = case_data["id"]

        # 2. Seed a deterministic demo graph
        seed_res = await ac.post(
            "/api/v1/graph/demo-risk-scenario?chain=tron",
            headers=auth_headers,
        )
        assert seed_res.status_code == 200

        # 3. Generate Report v1.0
        report_req = {
            "title": "Evidentiary Brief: Phishing Money Flow",
            "include_tx_appendix": True,
            "max_appendix_txs": 25,
            "notes": "Generated for formal review by cyber intelligence unit.",
        }
        gen_res = await ac.post(
            f"/api/v1/investigations/{case_id}/reports",
            json=report_req,
            headers=auth_headers,
        )
        assert gen_res.status_code == 201
        report_1 = gen_res.json()

        assert report_1["caseId"] == case_id
        assert report_1["version"] == "1.0"
        assert report_1["status"] == "COMPLETED"
        assert report_1["fileSizeBytes"] > 1000
        assert report_1["sha256Hash"] is not None
        assert len(report_1["sha256Hash"]) == 64
        assert "REP-" in report_1["reportNumber"]

        report_1_id = report_1["id"]

        # 4. List Reports for the Case
        list_res = await ac.get(
            f"/api/v1/investigations/{case_id}/reports",
            headers=auth_headers,
        )
        assert list_res.status_code == 200
        reports_list = list_res.json()
        assert reports_list["total"] >= 1
        assert any(r["id"] == report_1_id for r in reports_list["reports"])

        # 5. Retrieve Report Metadata by ID
        get_res = await ac.get(f"/api/v1/reports/{report_1_id}", headers=auth_headers)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == report_1_id

        # 6. Stream Download and Verify Integrity
        download_res = await ac.get(f"/api/v1/reports/{report_1_id}/download", headers=auth_headers)
        assert download_res.status_code == 200
        assert download_res.headers["content-type"] == "application/pdf"
        assert "attachment" in download_res.headers["content-disposition"]
        assert download_res.headers["x-report-sha256"] == report_1["sha256Hash"]
        assert download_res.content.startswith(b"%PDF-")

        # 7. Inline Preview
        preview_res = await ac.get(f"/api/v1/reports/{report_1_id}/preview", headers=auth_headers)
        assert preview_res.status_code == 200
        assert preview_res.headers["content-type"] == "application/pdf"
        assert "inline" in preview_res.headers.get("content-disposition", "inline")

        # 8. Regenerate Report to Test Versioning (v1.1)
        gen_res_2 = await ac.post(
            f"/api/v1/investigations/{case_id}/reports",
            json={"title": "Updated Evidentiary Brief", "include_tx_appendix": False},
            headers=auth_headers,
        )
        assert gen_res_2.status_code == 201
        report_2 = gen_res_2.json()
        assert report_2["version"] == "1.1"
        assert report_2["id"] != report_1_id


@pytest.mark.asyncio
async def test_report_pdf_data_parity_with_api(auth_headers: dict[str, str]):
    """
    Verifies that the generated PDF contains the exact risk score, findings,
    and metadata present in the live API response.
    """
    import io

    import pypdf

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create case & seed graph
        case_res = await ac.post(
            "/api/v1/cases",
            json={
                "title": "Operation Red Velvet Parity Test",
                "fraudCategory": "PHISHING",
                "reportedAmount": "120000",
                "currency": "USDT",
                "incidentDate": "2026-09-02",
                "targetChain": "tron",
                "suspectWallet": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                "priority": "HIGH",
            },
            headers=auth_headers,
        )
        assert case_res.status_code == 201
        case_id = case_res.json()["id"]

        await ac.post("/api/v1/graph/demo-risk-scenario?chain=tron", headers=auth_headers)

        # Retrieve live risk assessment
        risk_res = await ac.get(f"/api/v1/investigations/{case_id}/risk", headers=auth_headers)
        assert risk_res.status_code == 200
        live_risk = risk_res.json()
        expected_score = live_risk["score"]
        expected_level = live_risk["risk_level"]

        # Generate report
        gen_res = await ac.post(
            f"/api/v1/investigations/{case_id}/reports",
            json={"title": "Data Parity Audit Report"},
            headers=auth_headers,
        )
        assert gen_res.status_code == 201
        report_data = gen_res.json()
        report_id = report_data["id"]

        # Download PDF bytes
        dl_res = await ac.get(f"/api/v1/reports/{report_id}/download", headers=auth_headers)
        assert dl_res.status_code == 200

        # Read PDF content
        reader = pypdf.PdfReader(io.BytesIO(dl_res.content))
        full_pdf_text = " ".join(p.extract_text() for p in reader.pages)

        # Parity Assertions
        assert f"{expected_score} / 100" in full_pdf_text
        assert f"{expected_level} RISK TIER" in full_pdf_text
        assert "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" in full_pdf_text
        assert "CONFIDENTIAL // INVESTIGATIVE USE ONLY" in full_pdf_text
        assert report_id in full_pdf_text


@pytest.mark.asyncio
async def test_report_security_and_errors(
    auth_headers: dict[str, str], viewer_auth_headers: dict[str, str]
):
    """Validates authorization constraints and error handling."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Non-existent case
        bad_case_res = await ac.post(
            "/api/v1/investigations/non-existent-id/reports",
            json={},
            headers=auth_headers,
        )
        assert bad_case_res.status_code == 404

        # Non-existent report
        bad_report_res = await ac.get("/api/v1/reports/non-existent-id", headers=auth_headers)
        assert bad_report_res.status_code == 404

        # Unauthenticated request
        unauth_res = await ac.get("/api/v1/reports")
        assert unauth_res.status_code == 401

        # Viewer role cannot generate reports
        viewer_gen_res = await ac.post(
            "/api/v1/investigations/any-case/reports",
            json={},
            headers=viewer_auth_headers,
        )
        assert viewer_gen_res.status_code == 403
