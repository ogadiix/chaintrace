"""
Phase 8 E2E Forensic Investigation Test Suite
Simulates the complete end-to-end investigator workflow:
1. Investigator Authentication (JWT login)
2. Case Intake (Create Case with complaint ref and suspect wallet)
3. Deterministic Fraud Scenario Graph Ingestion (Victim -> Suspect -> Mules -> Consolidation -> Sanctioned Mixer)
4. Multi-Hop Trace Traversal Execution
5. Graph Topology & Edge Verification
6. Heuristic Pattern Intelligence Detection
7. Curated VASP & Entity Attribution Evaluation
8. Explainable Risk Score & Bounded Prioritization Level Calculation
9. Manual Investigator Classification Override with Non-Destructive Provenance
10. Historical Investigation Audit Trail Verification
Source of truth: Master Prompt Phase 8 Sections 7-18, 33, 35
"""

import pytest
from apps.api.src.main import app
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_full_deterministic_investigator_e2e_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Investigator Login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "investigator@chaintrace.internal", "password": "Investigator123!"},
        )
        assert login_res.status_code == 200
        auth_data = login_res.json()
        assert "accessToken" in auth_data
        token = auth_data["accessToken"]
        auth_headers = {"Authorization": f"Bearer {token}"}

        # 2. Case Intake (Create Investigation)
        demo_suspect_wallet = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
        case_payload = {
            "title": "Operation IronChain — Investment Fraud Ring",
            "description": "Stolen USDT layered through intermediary mules into high-risk mixer destinations.",
            "complaintId": "NCRP-2026-99124",
            "fraudCategory": "INVESTMENT_FRAUD",
            "reportedAmount": "100000.00",
            "currency": "USDT",
            "incidentDate": "2026-03-01",
            "targetChain": "tron",
            "suspectWallet": demo_suspect_wallet,
            "initialTxHash": "demo_risk_tx_01_victim_to_suspect",
            "priority": "HIGH",
        }
        case_res = await client.post("/api/v1/cases", json=case_payload, headers=auth_headers)
        assert case_res.status_code == 201
        case_data = case_res.json()
        case_id = case_data["id"]
        assert case_data["caseNumber"].startswith("CT-")
        assert case_data["status"] in ("ACTIVE", "NEW")


        # 3. Seed Deterministic 5-Hop Demo Network
        seed_res = await client.post(
            f"/api/v1/graph/demo-risk-scenario?chain=tron&case_id={case_id}",
            headers=auth_headers,
        )
        assert seed_res.status_code == 200
        seed_data = seed_res.json()
        assert seed_data["status"] == "COMPLETED"
        assert seed_data["transactions_processed"] >= 8

        # 4. Execute Multi-Hop Trace Traversal
        trace_req = {
            "chain": "tron",
            "seed_wallet": demo_suspect_wallet,
            "max_hops": 5,
            "minimum_amount": "10.0",
            "asset": "USDT",
            "direction": "FORWARD",
        }
        trace_init_res = await client.post(
            f"/api/v1/investigations/{case_id}/trace",
            json=trace_req,
            headers=auth_headers,
        )
        assert trace_init_res.status_code == 202
        job_info = trace_init_res.json()
        job_id = job_info["id"]

        # Poll trace execution
        job_res = await client.get(f"/api/v1/investigations/jobs/{job_id}", headers=auth_headers)
        assert job_res.status_code == 200
        job_data = job_res.json()
        assert job_data["status"] in ("COMPLETED", "PARTIAL")
        assert job_data["result"] is not None
        trace_result = job_data["result"]

        # 5. Graph Topology Verification
        assert len(trace_result["paths"]) >= 1
        assert trace_result["statistics"]["max_hop_reached"] >= 2
        # Verify hops contain our intermediary mules
        hop_wallets = set()
        for path in trace_result["paths"]:
            for hop in path["hops"]:
                hop_wallets.add(hop["from_wallet"])
                hop_wallets.add(hop["to_wallet"])
        assert demo_suspect_wallet in hop_wallets

        # 6. Evaluate Pattern Intelligence
        intel_res = await client.post(
            f"/api/v1/investigations/{case_id}/intelligence/analyze?max_hops=5",
            headers=auth_headers,
        )
        assert intel_res.status_code == 200
        intel_data = intel_res.json()
        assert len(intel_data["findings"]) >= 1
        # Confirm rapid forwarding or fan-out was detected
        finding_types = [f["type"] for f in intel_data["findings"]]
        assert "RAPID_FORWARDING" in finding_types

        # 7. Evaluate VASP & Entity Attribution
        attr_res = await client.post(
            f"/api/v1/investigations/{case_id}/attribution/analyze?max_hops=5",
            headers=auth_headers,
        )
        assert attr_res.status_code == 200
        attr_data = attr_res.json()
        assert attr_data["matched_count"] >= 1
        # Verify terminal attribution matches the Sanctioned Mixer
        terminal_names = [
            t["entity"]["name"]
            for t in attr_data.get("terminal_attributions", [])
            if t.get("entity")
        ]
        assert any("Sanctioned Mixer" in name for name in terminal_names)

        # 8. Synthesize Explainable Risk Score
        risk_res = await client.post(
            f"/api/v1/investigations/{case_id}/risk/analyze?max_hops=5",
            headers=auth_headers,
        )
        assert risk_res.status_code == 200
        risk_data = risk_res.json()
        assert 0 <= risk_data["score"] <= 100
        assert risk_data["score"] >= 50
        assert risk_data["risk_level"] in ("HIGH", "CRITICAL")
        assert len(risk_data["reasons"]) >= 1
        assert len(risk_data["contributions"]) >= 1
        assert len(risk_data["evidence"]) >= 1

        # 9. Submit Manual Investigator Classification Override
        override_res = await client.post(
            f"/api/v1/investigations/{case_id}/risk/override",
            json={
                "override_level": "CRITICAL",
                "reason": "Court freeze order issued by cybercrime magistrate ref #ORD-88219",
            },
            headers=auth_headers,
        )
        assert override_res.status_code == 200
        overridden_data = override_res.json()
        assert overridden_data["manual_override"] is not None
        assert overridden_data["manual_override"]["override_level"] == "CRITICAL"
        assert (
            overridden_data["manual_override"]["reason"]
            == "Court freeze order issued by cybercrime magistrate ref #ORD-88219"
        )
        # Automated score is preserved unchanged!
        assert overridden_data["score"] == risk_data["score"]

        # 10. Verify Case Lifecycle Status Progression
        patch_res = await client.patch(
            f"/api/v1/cases/{case_id}",
            json={"status": "UNDER_REVIEW"},
            headers=auth_headers,
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["status"] == "UNDER_REVIEW"

        # 11. Retrieve Complete Chronological Audit Trail
        audit_res = await client.get(
            f"/api/v1/audit?case_id={case_id}",
            headers=auth_headers,
        )
        assert audit_res.status_code == 200
        audit_data = audit_res.json()
        assert audit_data["total"] >= 1
        actions = [e["action"] for e in audit_data["logs"]]
        assert any("CASE" in a for a in actions)


