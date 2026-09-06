"""
Mock NCRP Adapter
Provides simulated intake, validation, and sample complaint presets representing
the National Cybercrime Reporting Portal.
Source of truth: Master Prompt Phase 10 Sections 2, 3, 4, 13
"""

from typing import Any

from apps.api.src.schemas.integration import NcrpComplaintCreateSchema
from apps.api.src.services.integrations.base import NCRPAdapter
from chaintrace_shared import BlockchainType, is_valid_address


class MockNCRPAdapter(NCRPAdapter):
    """
    Simulated implementation of NCRP intake adapter.
    Uses synthetic non-PII records and rejects invalid blockchain addresses.
    """

    def validate_complaint(self, payload: NcrpComplaintCreateSchema) -> tuple[bool, str | None]:
        # 1. Validate Blockchain Network
        try:
            chain_enum = BlockchainType(payload.blockchain.lower())
        except ValueError:
            return (
                False,
                f"Unsupported blockchain '{payload.blockchain}'. Must be one of: tron, ethereum, bsc, polygon, bitcoin.",
            )

        # 2. Validate Wallet Address Syntax
        if not is_valid_address(chain_enum, payload.wallet_address):
            return (
                False,
                f"Invalid wallet address '{payload.wallet_address}' for network '{chain_enum.value}'.",
            )

        # 3. Validate Reported Amount
        try:
            amount_val = float(payload.reported_amount)
            if amount_val < 0:
                return False, "Reported loss amount cannot be negative."
        except ValueError:
            return False, f"Reported amount '{payload.reported_amount}' is not a valid number."

        return True, None

    def get_sample_complaints(self) -> list[dict[str, Any]]:
        """Returns pre-configured deterministic demo complaints for SIH presentation."""
        return [
            {
                "complaint_id": "NCRP-DEMO-2026-TRON-8891",
                "category": "INVESTMENT_SCAM",
                "reported_amount": "250000",
                "currency": "INR",
                "blockchain": "tron",
                "wallet_address": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                "transaction_hash": "0x5a19c3b88d7426e890b3456789abcdef0123456789abcdef0123456789abcdef",
                "description": "Victim lured into high-yield USDT staking telegram scheme. Transferred 3,000 USDT to suspect wallet.",
                "victim_reference": "NCRP-SYNTHETIC-VICTIM-01",
                "notes": "Triggers 5-hop fraud peeling pattern terminating at Binance deposit.",
            },
            {
                "complaint_id": "NCRP-DEMO-2026-ETH-4420",
                "category": "PHISHING",
                "reported_amount": "150000",
                "currency": "INR",
                "blockchain": "ethereum",
                "wallet_address": "0x28C6c06298d514Db089934071355E5743bf21d60",
                "transaction_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                "description": "Victim signed malicious ERC-20 permit drainer on counterfeit web3 portal.",
                "victim_reference": "NCRP-SYNTHETIC-VICTIM-02",
                "notes": "Direct interaction with documented exchange custody infrastructure.",
            },
        ]
