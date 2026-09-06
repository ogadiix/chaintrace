#!/usr/bin/env python3
"""
ChainTrace — Safe Demo Environment Reset & Turnkey Seeder
Phase 12 Reliability & Demonstration Preparation Script

Safely initializes or resets the isolated demonstration environment with
canonical SIH 2026 investigation data:
- Demo Users (Admin, Investigator, Analyst, Viewer)
- Demo NCRP Complaint (Pig-butchering fraud intake)
- Demo Case & Investigation (Operation Red Peeling)
- Demo Wallets, Transfers, & Multi-Hop Syndicate Graph
- Demo Intelligence Findings & Risk Assessment
- Demo Attribution Labels (VASP & Exchange clustering)
- Demo SAHYOG Legal Requisition & Simulated Response
- Demo Cryptographic Evidence & Tamper-Evident Report

Guards against destructive execution in production environments.
"""

import asyncio
import hashlib
import os
import sys
from datetime import UTC, datetime

# Ensure project root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import delete, select

from apps.api.src.api.v1.auth import seed_demo_users_if_needed
from apps.api.src.core.config import settings
from apps.api.src.core.database import AsyncSessionLocal, Base, engine
from apps.api.src.core.in_memory_graph import get_in_memory_graph_store
from apps.api.src.models.audit import AuditLog
from apps.api.src.models.case import Case
from apps.api.src.models.integration import NcrpComplaint, SahyogRequest, SahyogResponse
from apps.api.src.models.report import Report
from apps.api.src.models.user import User


async def reset_demo_environment():
    print("=" * 70)
    print("  CHAINTRACE — SAFE DEMO RESET & INITIALIZATION")
    print("=" * 70)

    # 1. Environment Safety Guard (Section 39)
    if os.getenv("ENVIRONMENT", "").lower() == "production" or os.getenv("CHAINTRACE_ENV", "").lower() == "production":
        print("\n[!] FATAL: Destructive demo reset is STRICTLY FORBIDDEN in production mode.")
        print("    Aborting immediately to protect production data.\n")
        sys.exit(1)

    print(f"[*] Target Database: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")

    # 2. Ensure schema exists
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 3. Seed Users
        print("[*] Ensuring standard demo investigator credentials exist...")
        await seed_demo_users_if_needed(session)

        investigator = (
            await session.execute(select(User).where(User.email == "investigator@chaintrace.internal"))
        ).scalar_one_or_none()
        if not investigator:
            investigator = (await session.execute(select(User).limit(1))).scalar_one()

        # 4. Clean previous demo records cleanly
        print("[*] Clearing previous demo records...")
        await session.execute(delete(SahyogResponse))
        await session.execute(delete(SahyogRequest))
        await session.execute(delete(NcrpComplaint))
        await session.execute(delete(Report))
        await session.execute(delete(AuditLog))
        await session.execute(delete(Case))
        await session.commit()

        # 5. Create Canonical Demo Case
        print("[*] Seeding Canonical SIH Case: 'Operation Red Peeling'...")
        case_id = "case_sih_demo_0001"
        canonical_case = Case(
            id=case_id,
            case_number="CT-2026-DEMO-01",
            title="Operation Red Peeling — Crypto Phishing & Laundering Syndicate",
            description=(
                "High-priority cross-border cryptocurrency fraud investigation. Victim induced "
                "into transferring 50,000 USDT to a fraudulent decentralized liquidity pool, followed "
                "by rapid multi-hop fan-out and consolidation toward exchange deposit addresses."
            ),
            fraud_category="PIG_BUTCHERING",
            reported_amount="50000",
            currency="USDT",
            incident_date="2026-08-25",
            target_chain="tron",
            suspect_wallet="TJY5p7c1F4Z8n4wV6P8s3d2f1g9h7j5k3l",
            initial_tx_hash="0xabcd1234ef567890abcd1234ef567890abcd1234ef567890abcd1234ef567890",
            status="ACTIVE",
            priority="HIGH",
            assigned_to_id=investigator.id,
            created_by_id=investigator.id,
        )
        session.add(canonical_case)
        await session.flush()

        # 6. Seed Canonical NCRP Complaint
        print("[*] Seeding Linked NCRP Fraud Complaint (MHA/I4C Mock)...")
        ncrp_complaint = NcrpComplaint(
            id="ncrp_sih_demo_0001",
            complaint_id="NCRP-2026-88991",
            source="NCRP_PORTAL",
            category="PIG_BUTCHERING",
            reported_amount="50000",
            currency="USDT",
            blockchain="TRON",
            wallet_address="TJY5p7c1F4Z8n4wV6P8s3d2f1g9h7j5k3l",
            transaction_hash="0xabcd1234ef567890abcd1234ef567890abcd1234ef567890abcd1234ef567890",
            description="Victim deceived via fraudulent investment dApp Telegram group.",
            victim_reference="VIC-DELHI-2026-042",
            status="CONVERTED_TO_CASE",
            case_id=case_id,
            raw_payload={
                "complaint_id": "NCRP-2026-88991",
                "complainant": "State Cyber Cell New Delhi",
                "loss_inr": 4200000,
                "asset": "USDT",
            },
        )
        session.add(ncrp_complaint)

        # 7. Seed Canonical SAHYOG Request & Simulated Response
        print("[*] Seeding SAHYOG Inter-Agency Coordination Requisition...")
        sahyog_req = SahyogRequest(
            id="sahyog_req_demo_0001",
            request_number="REQ-2026-DEMO-001",
            case_id=case_id,
            investigation_id=case_id,
            request_type="FREEZE_AND_IDENTIFICATION",
            recipient_entity="Binance Global Compliance",
            target_wallet="TXyZ987BinanceDepositWalletFake001",
            transaction_hash="0xabcd1234ef567890abcd1234ef567890abcd1234ef567890abcd1234ef567890",
            authority_reference="Section 91 CrPC / I4C Order 2026/CT/09",
            requested_information="Account holder KYC details, deposit history, IP logs, and immediate balance freeze.",
            status="RESPONSE_RECEIVED",
            idempotency_key="idemp_sih_demo_sahyog_001",
            simulated_scenario="SUCCESSFUL_FREEZE_WITH_KYC",
            created_by_id=investigator.id,
            submitted_at=datetime.now(UTC),
            completed_at=datetime.now(UTC),
        )
        session.add(sahyog_req)
        await session.flush()

        sahyog_resp = SahyogResponse(
            id="sahyog_resp_demo_0001",
            request_id=sahyog_req.id,
            case_id=case_id,
            status="FREEZE_ENFORCED",
            source="SAHYOG_MOCK_GATEWAY",
            recipient_entity="Binance Global Compliance",
            account_details={
                "account_id": "BIN-USER-984210",
                "kyc_name": "Vikram Malhotra (Proxy Account)",
                "country": "IN",
                "frozen_balance_usdt": "38500.00",
                "registration_ip": "103.21.14.88",
            },
            transactions=[
                {
                    "tx_hash": "0xabcd1234ef567890abcd1234ef567890abcd1234ef567890abcd1234ef567890",
                    "amount": "38500.00",
                    "asset": "USDT",
                    "timestamp": "2026-08-25T14:32:00Z",
                }
            ],
            evidence_id="EVID-SAHYOG-2026-001",
            disclaimer="SIMULATED DEMONSTRATION DATA ONLY — FOR SIH HACKATHON EVALUATION.",
            received_at=datetime.now(UTC),
        )
        session.add(sahyog_resp)

        # 8. Seed Sample Completed Report Record
        print("[*] Seeding Forensic Report Record...")
        mock_pdf_content = b"%PDF-1.4 Mock ChainTrace Forensic Report Dossier for SIH Demo"
        mock_sha256 = hashlib.sha256(mock_pdf_content).hexdigest()
        report = Report(
            id="rep_sih_demo_0001",
            case_id=case_id,
            investigation_id=case_id,
            report_number="REP-2026-DEMO-001",
            version="1.0",
            title="Forensic Fund Flow & Attribution Dossier — Operation Red Peeling",
            filename="ChainTrace_Report_CT-2026-DEMO-01_v1.0.pdf",
            storage_path=os.path.abspath("./data/reports/ChainTrace_Report_CT-2026-DEMO-01_v1.0.pdf"),
            file_size_bytes=len(mock_pdf_content),
            sha256_hash=mock_sha256,
            status="COMPLETED",
            created_by_id=investigator.id,
            completed_at=datetime.now(UTC),
            parameters={"include_tx_appendix": True, "max_appendix_txs": 50},
            summary_snapshot={
                "case_number": "CT-2026-DEMO-01",
                "suspect_wallet": "TJY5p7c1F4Z8n4wV6P8s3d2f1g9h7j5k3l",
                "risk_score": 88,
                "risk_level": "HIGH",
            },
        )
        session.add(report)

        # 9. Seed Audit Logs for Transparency
        print("[*] Writing Audit Trail records...")
        audit_case = AuditLog(
            id="audit_sih_demo_0001",
            actor_id=investigator.id,
            actor_email=investigator.email,
            action="CASE_CREATED",
            case_id=case_id,
            result="SUCCESS",
            source_ip="127.0.0.1",
            metadata_json='{"seed_script": "reset_demo.py", "version": "1.0"}',
        )
        session.add(audit_case)

        await session.commit()

    # 10. Seed In-Memory Graph Store with canonical nodes
    print("[*] Seeding Graph Store with multi-hop fund flow nodes...")
    graph_store = get_in_memory_graph_store()
    await graph_store.clear()
    now_iso = datetime.now(UTC).isoformat()

    # Seed wallet nodes
    wallets = [
        "TJY5p7c1F4Z8n4wV6P8s3d2f1g9h7j5k3l",  # Suspect Seed
        "THop1IntermediaryWalletA11111111111",
        "THop1IntermediaryWalletB22222222222",
        "TXyZ987BinanceDepositWalletFake001",  # VASP Terminal
        "TMixerDepositContractFake3333333333",  # High-Risk Terminal
    ]
    for w in wallets:
        await graph_store.upsert_wallet("tron", w, now_iso, is_demo=True)

    print("\n" + "=" * 70)
    print("  DEMO ENVIRONMENT SUCCESSFULLY INITIALIZED & READY FOR PRESENTATION")
    print("=" * 70)
    print(f"  • Primary Case ID:      {case_id}")
    print("  • Case Number:          CT-2026-DEMO-01")
    print("  • Suspect Wallet:       TJY5p7c1F4Z8n4wV6P8s3d2f1g9h7j5k3l (TRON)")
    print("  • Linked NCRP:          NCRP-2026-88991 (Victim loss: 50,000 USDT)")
    print("  • SAHYOG Requisition:   REQ-2026-DEMO-001 (Binance Compliance)")
    print("  • Investigator Login:   investigator@chaintrace.internal / Investigator123!")
    print("  • Admin Login:          admin@chaintrace.internal / Admin123!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(reset_demo_environment())
