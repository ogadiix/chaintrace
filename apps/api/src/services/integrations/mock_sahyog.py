"""
Mock SAHYOG Adapter
Simulates VASP and Intermediary information responses and freeze notices
under the I4C SAHYOG coordination framework.
Source of truth: Master Prompt Phase 10 Sections 9, 10, 11, 14, 15, 27, 28
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from apps.api.src.models.integration import SahyogRequest, SahyogResponse
from apps.api.src.services.integrations.base import SAHYOGAdapter


class MockSAHYOGAdapter(SAHYOGAdapter):
    """
    Simulated intermediary/VASP responder.
    Produces deterministic synthetic records for hackathon evaluation.
    NEVER sends real requests or modifies actual exchange assets.
    """

    async def submit_request(self, request: SahyogRequest) -> SahyogResponse:
        scenario = request.simulated_scenario.upper().strip()
        response_id = str(uuid.uuid4())
        received_at = datetime.now(UTC)

        if scenario == "NO_MATCH":
            return SahyogResponse(
                id=response_id,
                request_id=request.id,
                case_id=request.case_id,
                status="NO_MATCH",
                source="SAHYOG_DEMO",
                recipient_entity=request.recipient_entity,
                account_details={
                    "match_found": False,
                    "compliance_notes": "No custodial account or identity documentation corresponds to the queried deposit address.",
                    "queried_wallet": request.target_wallet,
                },
                transactions=[],
                evidence_id=None,
                disclaimer="SIMULATED RESPONSE — FOR HACKATHON DEMONSTRATION ONLY",
                received_at=received_at,
            )

        elif scenario == "PROCESSING":
            return SahyogResponse(
                id=response_id,
                request_id=request.id,
                case_id=request.case_id,
                status="PROCESSING",
                source="SAHYOG_DEMO",
                recipient_entity=request.recipient_entity,
                account_details={
                    "processing_ticket": f"TICK-{str(uuid.uuid4())[:6].upper()}",
                    "compliance_notes": "Requisition received by legal compliance desk. Internal blockchain ledger audit in progress.",
                },
                transactions=[],
                evidence_id=None,
                disclaimer="SIMULATED RESPONSE — FOR HACKATHON DEMONSTRATION ONLY",
                received_at=received_at,
            )

        elif scenario == "REQUEST_FAILED":
            return SahyogResponse(
                id=response_id,
                request_id=request.id,
                case_id=request.case_id,
                status="FAILED",
                source="SAHYOG_DEMO",
                recipient_entity=request.recipient_entity,
                account_details={
                    "error_code": "VASP_TIMEOUT_SIMULATED",
                    "error_message": "Intermediary nodal gateway simulated network timeout.",
                },
                transactions=[],
                evidence_id=None,
                disclaimer="SIMULATED RESPONSE — FOR HACKATHON DEMONSTRATION ONLY",
                received_at=received_at,
            )

        elif scenario == "FREEZE_REQUEST_DEMO":
            evidence_id = f"EV-FREEZE-{str(uuid.uuid4())[:8].upper()}"
            return SahyogResponse(
                id=response_id,
                request_id=request.id,
                case_id=request.case_id,
                status="RESPONSE_RECEIVED",
                source="SAHYOG_DEMO",
                recipient_entity=request.recipient_entity,
                account_details={
                    "freeze_status": "FROZEN_FOR_INVESTIGATION [SIMULATED]",
                    "compliance_officer": "Compliance Desk Nodal Officer (Simulated)",
                    "account_uid": f"UID-SIM-{request.target_wallet[-6:]}",
                    "holding_status": "Deposit address flagged. Outflow operations halted in simulation sandbox.",
                    "statutory_ref": request.authority_reference,
                    "simulated_warning": "DEMONSTRATION ONLY — NO REAL ASSETS RESTRICTED",
                },
                transactions=[],
                evidence_id=evidence_id,
                disclaimer="SIMULATED RESPONSE — FOR HACKATHON DEMONSTRATION ONLY",
                received_at=received_at,
            )

        else:  # Default "SUCCESS" scenario
            evidence_id = f"EV-SAHYOG-{str(uuid.uuid4())[:8].upper()}"

            # Deterministic synthetic non-PII account details
            synthetic_account: dict[str, Any] = {
                "account_id": f"CUST-SIM-{request.target_wallet[-6:].upper()}",
                "masked_name": "A*** K***",
                "kyc_status": "VERIFIED_TIER_2",
                "registration_date": "2025-11-14T10:30:00Z",
                "registered_phone_masked": "+91-XXXXX-XX891",
                "registered_email_masked": "a***@synthetic-investigation-mail.com",
                "associated_bank": "State Bank of India (Simulated)",
                "bank_account_masked": "XXXX-XXXX-4819",
                "account_status": "ACTIVE",
                "compliance_verification": "Matched via on-chain deposit attribution records.",
            }

            # Synthetic internal transaction activity
            synthetic_txs: list[dict[str, Any]] = [
                {
                    "tx_id": f"INT-DEP-{str(uuid.uuid4())[:6].upper()}",
                    "type": "CRYPTO_DEPOSIT",
                    "asset": "USDT",
                    "amount": "3,000.00",
                    "timestamp": "2026-08-20T14:32:00Z",
                    "counterparty_address": request.target_wallet,
                    "status": "CREDITED",
                },
                {
                    "tx_id": f"INT-WD-{str(uuid.uuid4())[:6].upper()}",
                    "type": "FIAT_P2P_TRANSFER",
                    "asset": "INR",
                    "amount": "2,50,000.00",
                    "timestamp": "2026-08-20T14:55:00Z",
                    "bank_account_ref": "XXXX-XXXX-4819",
                    "status": "COMPLETED",
                },
            ]

            return SahyogResponse(
                id=response_id,
                request_id=request.id,
                case_id=request.case_id,
                status="RESPONSE_RECEIVED",
                source="SAHYOG_DEMO",
                recipient_entity=request.recipient_entity,
                account_details=synthetic_account,
                transactions=synthetic_txs,
                evidence_id=evidence_id,
                disclaimer="SIMULATED RESPONSE — FOR HACKATHON DEMONSTRATION ONLY",
                received_at=received_at,
            )
