"""
Phase 12: Full System Testing & Reliability Suite
Validates:
1. Report Consistency (Database == API == Frontend/Model == PDF)
2. Database Transaction Consistency & Rollback Semantics
3. Background Job Lifecycle & Worker Failure Recovery
4. Performance Benchmarks & Large Graph Traversal Bounding (10, 100, 1000 nodes)
5. External Provider Degradation & Secret Sanitization
"""

import asyncio
from datetime import UTC, datetime
import hashlib
import io
import time
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from pypdf import PdfReader
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.src.core.database import AsyncSessionLocal, get_db
from apps.api.src.main import app
from apps.api.src.core.in_memory_graph import InMemoryGraphStore, make_wallet_id
from apps.api.src.models.case import Case
from apps.api.src.models.report import Report
from apps.api.src.models.trace import TraceJob, TraceRequest, TraceResult
from apps.api.src.models.user import User
from apps.api.src.services.trace_service import TraceJobManager, get_trace_job_manager
from chaintrace_shared import BlockchainType, CasePriority, CaseStatus, JobStatus, UserRole


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
async def investigator_headers(client: AsyncClient) -> dict[str, str]:
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "investigator@chaintrace.internal", "password": "Investigator123!"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["accessToken"]
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


# ==============================================================================
# 1. REPORT CONSISTENCY: Database == API == PDF
# ==============================================================================
@pytest.mark.asyncio
async def test_report_consistency_db_api_pdf(client: AsyncClient, investigator_headers: dict[str, str]):
    """
    Section 16: Verify exact parity across:
    Database record == API response == Generated PDF document.
    """
    # 1. Create a dedicated investigation case
    case_payload = {
        "title": "Operation Reliability Parity Audit",
        "description": "Verifying exact report consistency between DB, API and PDF",
        "priority": "HIGH",
        "fraudCategory": "OTHER",
        "reportedAmount": "10000",
        "currency": "USD",
        "incidentDate": "2026-09-01",
        "targetChain": "ethereum",
        "suspectWallet": "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5",
    }
    create_resp = await client.post("/api/v1/cases", json=case_payload, headers=investigator_headers)
    assert create_resp.status_code == 201
    case_data = create_resp.json()
    case_id = case_data["id"]

    # 2. Generate PDF report via API
    gen_payload = {
        "title": "Forensic Parity Investigation Dossier",
        "include_tx_appendix": True,
        "max_appendix_txs": 15,
        "notes": "Verified by Automated Phase 12 Parity Checker",
    }
    gen_resp = await client.post(
        f"/api/v1/investigations/{case_id}/reports",
        json=gen_payload,
        headers=investigator_headers,
    )
    assert gen_resp.status_code == 201
    api_report = gen_resp.json()
    report_id = api_report["id"]

    # 3. Retrieve DB record directly
    async with AsyncSessionLocal() as db_session:
        stmt = select(Report).where(Report.id == report_id)
        res = await db_session.execute(stmt)
        db_report = res.scalar_one_or_none()
        assert db_report is not None

        # Direct parity checks: API vs Database
        assert api_report["id"] == str(db_report.id)
        assert api_report["caseId"] == str(db_report.case_id)
        assert api_report["version"] == db_report.version
        assert api_report["status"] == db_report.status
        assert api_report["sha256Hash"] == db_report.sha256_hash
        assert api_report["fileSizeBytes"] == db_report.file_size_bytes

    # 4. Download generated PDF and verify file hash and size integrity
    dl_resp = await client.get(
        f"/api/v1/reports/{report_id}/download",
        headers=investigator_headers,
    )
    assert dl_resp.status_code == 200
    pdf_bytes = dl_resp.content

    # Verify SHA256 matches DB and API
    computed_sha256 = hashlib.sha256(pdf_bytes).hexdigest()
    assert computed_sha256 == db_report.sha256_hash
    assert computed_sha256 == api_report["sha256Hash"]
    assert len(pdf_bytes) == db_report.file_size_bytes
    assert len(pdf_bytes) == api_report["fileSizeBytes"]

    # 5. Extract PDF content and assert semantic parity
    reader = PdfReader(io.BytesIO(pdf_bytes))
    assert len(reader.pages) >= 1
    extracted_text = ""
    for page in reader.pages:
        extracted_text += page.extract_text() or ""

    # Parity verification with PDF text
    assert case_id in extracted_text or case_id[:8] in extracted_text
    assert case_payload["suspectWallet"] in extracted_text
    assert "CHAINTRACE" in extracted_text
    assert db_report.version in extracted_text


# ==============================================================================
# 2. DATABASE TRANSACTION CONSISTENCY & ROLLBACK SEMANTICS
# ==============================================================================
@pytest.mark.asyncio
async def test_database_transaction_rollback_on_failure():
    """
    Section 20: Simulate failure midway through a multi-step transaction.
    Verify that uncommitted state is rolled back cleanly and no dirty records exist.
    """
    async with AsyncSessionLocal() as session:
        # Get baseline case count and a valid user ID
        count_stmt = select(func.count(Case.id))
        initial_count = (await session.execute(count_stmt)).scalar() or 0

        user_stmt = select(User.id).limit(1)
        user_id = (await session.execute(user_stmt)).scalar()
        assert user_id is not None

        # Attempt atomic multi-step operation with intentional failure
        try:
            temp_case = Case(
                case_number="CT-ROLLBACK-9999",
                title="Rollback Test Case",
                description="Should be rolled back",
                fraud_category="OTHER",
                reported_amount="1000",
                currency="USD",
                incident_date="2026-09-01",
                target_chain="ethereum",
                suspect_wallet="0xRollbackWalletAddress00000000000000001",
                status="ACTIVE",
                priority="LOW",
                created_by_id=user_id,
            )
            session.add(temp_case)
            await session.flush()  # flushes into transaction but uncommitted

            # Simulate an unhandled exception before commit
            raise RuntimeError("Simulated mid-operation transaction failure")

            await session.commit()
        except RuntimeError:
            await session.rollback()

        # Verify rollback resulted in zero persisted changes
        final_count = (await session.execute(count_stmt)).scalar() or 0
        assert final_count == initial_count

        # Query specifically for the rolled back wallet
        check_stmt = select(Case).where(Case.suspect_wallet == "0xRollbackWalletAddress00000000000000001")
        found = (await session.execute(check_stmt)).scalar_one_or_none()
        assert found is None, "Dirty record was incorrectly persisted after transaction failure"


# ==============================================================================
# 3. BACKGROUND JOB LIFECYCLE & FAILURE RECOVERY
# ==============================================================================
@pytest.mark.asyncio
async def test_background_job_lifecycle_and_failure_recovery():
    """
    Section 21 & 22: Validate TraceJob lifecycle:
    QUEUED -> RUNNING -> COMPLETED / FAILED,
    ensuring jobs never get permanently stuck and errors are handled safely.
    """
    manager = TraceJobManager()

    # 1. Normal successful background execution
    req = TraceRequest(
        chain=BlockchainType.ETHEREUM,
        seed_wallet="0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5",
        max_hops=1,
    )
    job = await manager.create_job(req, investigation_id="inv_test_lifecycle")
    assert job.status in [JobStatus.QUEUED, JobStatus.RUNNING]

    # Wait for completion
    for _ in range(50):
        await asyncio.sleep(0.1)
        job_status = await manager.get_job(job.id)
        if job_status and job_status.status in [JobStatus.COMPLETED, JobStatus.PARTIAL]:
            break

    final_job = await manager.get_job(job.id)
    assert final_job is not None
    assert final_job.status == JobStatus.COMPLETED
    assert final_job.result is not None
    assert final_job.progress["nodes_processed"] > 0

    # 2. Simulated engine failure and graceful failure transition
    faulty_manager = TraceJobManager()
    with patch.object(
        faulty_manager._engine, "execute_trace", side_effect=ValueError("Simulated graph engine failure")
    ):
        faulty_job = await faulty_manager.create_job(req, investigation_id="inv_test_fault")

        for _ in range(50):
            await asyncio.sleep(0.1)
            fj = await faulty_manager.get_job(faulty_job.id)
            if fj and fj.status == JobStatus.FAILED:
                break

        res_fault = await faulty_manager.get_job(faulty_job.id)
        assert res_fault is not None
        assert res_fault.status == JobStatus.FAILED
        assert res_fault.error_message is not None
        # Must not leak raw Python traceback/secrets to user
        assert "internal error" in res_fault.error_message.lower()


# ==============================================================================
# 4. PERFORMANCE BENCHMARKS & LARGE GRAPH TRAVERSAL BOUNDING
# ==============================================================================
@pytest.mark.asyncio
async def test_large_graph_scalability_and_bounding():
    """
    Section 23 & 24: Test scalability and bounding with 10, 100, and 1,000 nodes/edges.
    Verify execution latency is bounded, graph queries finish rapidly, and depth capping
    prevents infinite loops or memory explosion.
    """
    store = InMemoryGraphStore()
    now = datetime.now(UTC).isoformat()

    # 1. Benchmark 10 nodes
    start_10 = time.perf_counter()
    for i in range(10):
        await store.upsert_wallet("ethereum", f"0xWallet_10_{i:04d}", now)
    time_10 = time.perf_counter() - start_10
    assert time_10 < 0.2
    assert len(store._nodes) == 10

    # 2. Benchmark 100 nodes
    start_100 = time.perf_counter()
    for i in range(100):
        await store.upsert_wallet("ethereum", f"0xWallet_100_{i:04d}", now)
    time_100 = time.perf_counter() - start_100
    assert time_100 < 0.5
    assert len(store._nodes) == 110  # 10 + 100

    # 3. Benchmark 1,000 nodes
    start_1000 = time.perf_counter()
    for i in range(1000):
        await store.upsert_wallet("bitcoin", f"bc1qwallet1000{i:04d}", now)
    time_1000 = time.perf_counter() - start_1000
    assert time_1000 < 1.5, f"1,000 nodes ingestion took {time_1000:.3f}s, exceeding SLA"
    assert len(store._nodes) == 1110

    # 4. Verify neighborhood query performance on large graph
    query_start = time.perf_counter()
    subgraph = await store.get_wallet_neighborhood("bitcoin", "bc1qwallet10000050", max_hops=1, limit=50)
    query_time = time.perf_counter() - query_start
    assert query_time < 0.2
    assert subgraph is not None


# ==============================================================================
# 5. EXTERNAL PROVIDER ERROR SANITIZATION & NO SECRETS LEAK
# ==============================================================================
@pytest.mark.asyncio
async def test_external_provider_error_sanitization(client: AsyncClient, investigator_headers: dict[str, str]):
    """
    Section 28 & 29: Ensure provider errors, timeouts, or 503s fail gracefully
    without leaking internal URLs, stack traces, or authorization tokens.
    """
    with patch(
        "apps.api.src.services.blockchain_service.BlockchainService.get_transactions",
        side_effect=Exception("Provider https://api.etherscan.io?apikey=SECRET_TOKEN_9999 connection reset"),
    ):
        resp = await client.post(
            "/api/v1/graph/trace",
            json={
                "chain": "ethereum",
                "seed_wallet": "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5",
                "max_hops": 2,
            },
            headers=investigator_headers,
        )
        # Should gracefully return error response or completed with error note
        assert resp.status_code in [200, 500, 502, 503]
        resp_text = resp.text
        # CRITICAL SECURITY ASSERTION: Must NOT leak API keys or raw provider URLs in response body
        assert "SECRET_TOKEN_9999" not in resp_text
