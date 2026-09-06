"""
Intelligence Rules Implementation
Implements deterministic, explainable pattern detection rules:
1. RapidForwardingRule (receive -> quick onward transfer)
2. HighFanOutRule (one-to-many dispersion)
3. HighFanInRule (many-to-one consolidation)
4. PeelChainRule (consecutive small drain + large continuation)
5. RoundAmountRule (repeated round integer value transfers)
6. RepeatedDestinationRule (multiple transfers to identical recipient)
7. VelocitySpikeRule (unusual transactions/hour bursts)

Source of truth: Master Prompt Phase 5 Sections 5-11, 14, 15, 18
"""

import uuid
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from apps.api.src.models.intelligence import EvidenceReference, IntelligenceFinding
from apps.api.src.services.intelligence.base import IntelligenceRule, RuleEvaluationContext
from chaintrace_shared import FindingSeverity, FindingType


def _parse_dec(val: Any) -> Decimal:
    if val is None:
        return Decimal(0)
    try:
        return Decimal(str(val).strip())
    except (InvalidOperation, ValueError):
        return Decimal(0)


def _parse_iso(ts_str: str) -> datetime | None:
    if not ts_str:
        return None
    try:
        cleaned = ts_str.replace("Z", "+00:00")
        return datetime.fromisoformat(cleaned)
    except Exception:
        return None


# ==============================================================================
# 1. RAPID FORWARDING RULE (Section 5)
# ==============================================================================


class RapidForwardingRule(IntelligenceRule):
    """
    Detects funds received by an intermediary and subsequently forwarded onward within a short window.
    Default threshold: <= 300 seconds (5 minutes).
    """

    id = "rule_rapid_forwarding"
    version = "1.0.0"
    name = "Rapid Forwarding Pattern"
    description = "Detects rapid onward transfer of received funds within a brief time delta"

    def evaluate(self, context: RuleEvaluationContext) -> list[IntelligenceFinding]:
        findings: list[IntelligenceFinding] = []
        max_delta_sec = float(context.config.get("rapid_forwarding_seconds", 300.0))
        paths = context.trace_result.paths

        for path in paths:
            hops = path.hops
            if len(hops) < 2:
                continue

            for i in range(len(hops) - 1):
                in_hop = hops[i]
                out_hop = hops[i + 1]

                # Intermediary wallet check
                if in_hop.to_wallet != out_hop.from_wallet:
                    continue

                t_in = _parse_iso(in_hop.timestamp)
                t_out = _parse_iso(out_hop.timestamp)
                if not t_in or not t_out:
                    continue

                delta_sec = (t_out - t_in).total_seconds()
                if 0 <= delta_sec <= max_delta_sec:
                    finding_id = f"find_rf_{uuid.uuid4().hex[:8]}"
                    now_str = datetime.now(UTC).isoformat()
                    in_amt = _parse_dec(in_hop.amount)
                    out_amt = _parse_dec(out_hop.amount)

                    fact = (
                        f"Wallet {in_hop.to_wallet} received {in_amt} {in_hop.asset} in tx {in_hop.tx_hash}, "
                        f"and {delta_sec:.1f} seconds later transferred {out_amt} {out_hop.asset} "
                        f"onward to {out_hop.to_wallet} in tx {out_hop.tx_hash}."
                    )
                    interpretation = (
                        f"This behavioral sequence exhibits rapid forwarding characteristics ({delta_sec:.1f}s interval), "
                        f"commonly associated with layering or pass-through intermediary wallets."
                    )

                    findings.append(
                        IntelligenceFinding(
                            finding_id=finding_id,
                            investigation_id=context.investigation_id,
                            type=FindingType.RAPID_FORWARDING,
                            severity=FindingSeverity.HIGH
                            if delta_sec <= 60
                            else FindingSeverity.MEDIUM,
                            title="Rapid Fund Forwarding Observed",
                            description=f"Funds moved through wallet {in_hop.to_wallet} within {delta_sec:.1f} seconds.",
                            observed_fact=fact,
                            interpretation=interpretation,
                            confidence=0.92 if delta_sec <= 60 else 0.82,
                            evidence_refs=[
                                EvidenceReference(
                                    type="TRANSACTION",
                                    ref_id=in_hop.tx_hash,
                                    description=f"Inflow transfer of {in_amt} {in_hop.asset}",
                                ),
                                EvidenceReference(
                                    type="TRANSACTION",
                                    ref_id=out_hop.tx_hash,
                                    description=f"Outflow transfer of {out_amt} {out_hop.asset}",
                                ),
                                EvidenceReference(
                                    type="WALLET",
                                    ref_id=in_hop.to_wallet,
                                    description="Intermediary pass-through wallet",
                                ),
                            ],
                            rule_id=self.id,
                            rule_version=self.version,
                            metadata={"time_delta_sec": delta_sec, "wallet": in_hop.to_wallet},
                            created_at=now_str,
                        )
                    )

        return findings


# ==============================================================================
# 2. HIGH FAN-OUT RULE (Section 6)
# ==============================================================================


class HighFanOutRule(IntelligenceRule):
    """
    Detects wallets distributing funds to multiple unique destination addresses.
    Default threshold: fan_out >= 3 unique destinations.
    """

    id = "rule_high_fan_out"
    version = "1.0.0"
    name = "High Fan-Out Dispersion"
    description = "Detects one-to-many fund dispersal to multiple recipient addresses"

    def evaluate(self, context: RuleEvaluationContext) -> list[IntelligenceFinding]:
        findings: list[IntelligenceFinding] = []
        dest_threshold = int(context.config.get("fan_out_destination_threshold", 3))

        for addr, features in context.wallet_features.items():
            if features.fan_out >= dest_threshold:
                finding_id = f"find_fo_{uuid.uuid4().hex[:8]}"
                now_str = datetime.now(UTC).isoformat()

                fact = (
                    f"Wallet {addr} made {features.outgoing_tx_count} outgoing transfers across "
                    f"{features.fan_out} unique recipient addresses totaling {features.total_outgoing_amount}."
                )
                interpretation = (
                    f"One-to-many dispersion pattern observed across {features.fan_out} destinations, "
                    f"consistent with fund splitting or mule dispersal operations."
                )

                findings.append(
                    IntelligenceFinding(
                        finding_id=finding_id,
                        investigation_id=context.investigation_id,
                        type=FindingType.HIGH_FAN_OUT,
                        severity=FindingSeverity.HIGH
                        if features.fan_out >= 5
                        else FindingSeverity.MEDIUM,
                        title=f"High Fan-Out Pattern ({features.fan_out} Destinations)",
                        description=f"Wallet dispersed funds to {features.fan_out} distinct destination wallets.",
                        observed_fact=fact,
                        interpretation=interpretation,
                        confidence=min(0.70 + (features.fan_out * 0.05), 0.95),
                        evidence_refs=[
                            EvidenceReference(
                                type="WALLET",
                                ref_id=addr,
                                description=f"Originating wallet for {features.fan_out} dispersals",
                            )
                        ],
                        rule_id=self.id,
                        rule_version=self.version,
                        metadata={
                            "fan_out": features.fan_out,
                            "destinations": features.unique_destinations,
                        },
                        created_at=now_str,
                    )
                )

        return findings


# ==============================================================================
# 3. HIGH FAN-IN RULE (Section 7)
# ==============================================================================


class HighFanInRule(IntelligenceRule):
    """
    Detects consolidation points where multiple unique sources fund a single recipient.
    Default threshold: fan_in >= 3 unique sources.
    """

    id = "rule_high_fan_in"
    version = "1.0.0"
    name = "Consolidation Fan-In Pattern"
    description = "Detects many-to-one aggregation of funds from multiple source addresses"

    def evaluate(self, context: RuleEvaluationContext) -> list[IntelligenceFinding]:
        findings: list[IntelligenceFinding] = []
        source_threshold = int(context.config.get("fan_in_source_threshold", 3))

        for addr, features in context.wallet_features.items():
            if features.fan_in >= source_threshold:
                finding_id = f"find_fi_{uuid.uuid4().hex[:8]}"
                now_str = datetime.now(UTC).isoformat()

                fact = (
                    f"Wallet {addr} received {features.incoming_tx_count} incoming transfers from "
                    f"{features.fan_in} unique source addresses totaling {features.total_incoming_amount}."
                )
                interpretation = (
                    f"Consolidation behavior observed: multiple accounts ({features.fan_in} sources) "
                    f"converging funds into a central collector wallet."
                )

                findings.append(
                    IntelligenceFinding(
                        finding_id=finding_id,
                        investigation_id=context.investigation_id,
                        type=FindingType.HIGH_FAN_IN,
                        severity=FindingSeverity.HIGH
                        if features.fan_in >= 5
                        else FindingSeverity.MEDIUM,
                        title=f"Consolidation Fan-In Pattern ({features.fan_in} Sources)",
                        description=f"Wallet collected funds from {features.fan_in} separate source wallets.",
                        observed_fact=fact,
                        interpretation=interpretation,
                        confidence=min(0.70 + (features.fan_in * 0.05), 0.95),
                        evidence_refs=[
                            EvidenceReference(
                                type="WALLET",
                                ref_id=addr,
                                description=f"Consolidation collector wallet receiving from {features.fan_in} sources",
                            )
                        ],
                        rule_id=self.id,
                        rule_version=self.version,
                        metadata={"fan_in": features.fan_in, "sources": features.unique_sources},
                        created_at=now_str,
                    )
                )

        return findings


# ==============================================================================
# 4. PEEL-CHAIN RULE (Section 8)
# ==============================================================================


class PeelChainRule(IntelligenceRule):
    """
    Detects peel chain behavior: sequential hops where a small portion is peeled off
    while a large continuation portion moves forward.
    Default threshold: min_length >= 3 hops, continuation ratio >= 0.70.
    """

    id = "rule_peel_chain"
    version = "1.0.0"
    name = "Peel-Chain Pattern"
    description = "Detects sequential transfers peeling off small amounts while forwarding the bulk"

    def evaluate(self, context: RuleEvaluationContext) -> list[IntelligenceFinding]:
        findings: list[IntelligenceFinding] = []
        min_length = int(context.config.get("peel_chain_min_length", 3))
        continuation_threshold = Decimal(
            str(context.config.get("peel_chain_continuation_ratio", "0.70"))
        )

        for path in context.trace_result.paths:
            hops = path.hops
            if len(hops) < min_length:
                continue

            consecutive_peels = 0
            peel_evidence: list[EvidenceReference] = []

            for i in range(len(hops) - 1):
                amt1 = _parse_dec(hops[i].amount)
                amt2 = _parse_dec(hops[i + 1].amount)

                if amt1 > 0 and amt2 < amt1:
                    ratio = amt2 / amt1
                    if ratio >= continuation_threshold:
                        consecutive_peels += 1
                        peel_evidence.append(
                            EvidenceReference(
                                type="TRANSACTION",
                                ref_id=hops[i + 1].tx_hash,
                                description=f"Continuation hop {amt2} ({ratio * 100:.1f}% of prior {amt1})",
                            )
                        )

            if consecutive_peels >= (min_length - 1):
                finding_id = f"find_pc_{uuid.uuid4().hex[:8]}"
                now_str = datetime.now(UTC).isoformat()

                fact = (
                    f"Discovered a sequential chain of {len(hops)} hops where at least {consecutive_peels} "
                    f"consecutive transfers forward >= {continuation_threshold * 100:.0f}% of funds."
                )
                interpretation = (
                    "The fund movement is consistent with a peel-chain pattern, a common method of "
                    "gradually laundering funds while retaining the primary balance in motion."
                )

                findings.append(
                    IntelligenceFinding(
                        finding_id=finding_id,
                        investigation_id=context.investigation_id,
                        type=FindingType.PEEL_CHAIN,
                        severity=FindingSeverity.HIGH,
                        title=f"Peel-Chain Sequence Detected ({len(hops)} Hops)",
                        description="Sequential transfers peeling off incremental amounts along path.",
                        observed_fact=fact,
                        interpretation=interpretation,
                        confidence=0.88,
                        evidence_refs=peel_evidence,
                        rule_id=self.id,
                        rule_version=self.version,
                        metadata={
                            "chain_length": len(hops),
                            "consecutive_peels": consecutive_peels,
                        },
                        created_at=now_str,
                    )
                )

        return findings


# ==============================================================================
# 5. ROUND AMOUNT PATTERN RULE (Section 9)
# ==============================================================================


class RoundAmountRule(IntelligenceRule):
    """
    Detects repeated round-number transfers (e.g. multiples of 100, 1000, 5000, 10000).
    Acts as a supporting investigative signal.
    """

    id = "rule_round_amount"
    version = "1.0.0"
    name = "Round Amount Signal"
    description = "Detects high frequency of round-number cryptocurrency transfers"

    def evaluate(self, context: RuleEvaluationContext) -> list[IntelligenceFinding]:
        findings: list[IntelligenceFinding] = []
        min_tx_count = int(context.config.get("round_amount_min_tx", 2))
        ratio_threshold = float(context.config.get("round_amount_ratio_threshold", 0.70))

        for addr, features in context.wallet_features.items():
            if (
                features.total_tx_count >= min_tx_count
                and features.round_amount_ratio >= ratio_threshold
            ):
                finding_id = f"find_ra_{uuid.uuid4().hex[:8]}"
                now_str = datetime.now(UTC).isoformat()

                fact = (
                    f"Wallet {addr} participated in {features.total_tx_count} transfers where "
                    f"{features.round_amount_ratio * 100:.1f}% were exact multiples of 100 asset units."
                )
                interpretation = (
                    f"Repeated round-amount values observed ({features.round_amount_ratio * 100:.1f}%). "
                    f"While sometimes typical for fiat-pegged transfers, frequent round integers can indicate structured transfers."
                )

                findings.append(
                    IntelligenceFinding(
                        finding_id=finding_id,
                        investigation_id=context.investigation_id,
                        type=FindingType.ROUND_AMOUNT_PATTERN,
                        severity=FindingSeverity.LOW,
                        title="Repeated Round-Amount Transfers",
                        description=f"{features.round_amount_ratio * 100:.0f}% of transfers from {addr} are round figures.",
                        observed_fact=fact,
                        interpretation=interpretation,
                        confidence=0.75,
                        evidence_refs=[
                            EvidenceReference(
                                type="WALLET",
                                ref_id=addr,
                                description="Wallet with prevalent round-value transfers",
                            )
                        ],
                        rule_id=self.id,
                        rule_version=self.version,
                        metadata={"round_ratio": features.round_amount_ratio},
                        created_at=now_str,
                    )
                )

        return findings


# ==============================================================================
# 6. REPEATED DESTINATION RULE (Section 10)
# ==============================================================================


class RepeatedDestinationRule(IntelligenceRule):
    """
    Detects repeated transfers between the same sender and recipient wallets.
    Default threshold: >= 2 transfers to the same destination.
    """

    id = "rule_repeated_destination"
    version = "1.0.0"
    name = "Repeated Destination Pattern"
    description = "Detects recurring transfers directed to the same destination wallet"

    def evaluate(self, context: RuleEvaluationContext) -> list[IntelligenceFinding]:
        findings: list[IntelligenceFinding] = []
        repeat_threshold = int(context.config.get("repeated_destination_threshold", 2))

        for addr, features in context.wallet_features.items():
            for dst_addr, count in features.repeated_destinations.items():
                if count >= repeat_threshold and dst_addr != addr:
                    finding_id = f"find_rd_{uuid.uuid4().hex[:8]}"
                    now_str = datetime.now(UTC).isoformat()

                    fact = f"Wallet {addr} sent funds to destination {dst_addr} across {count} distinct transactions."
                    interpretation = (
                        f"Repeated fund routing to destination {dst_addr} ({count} occurrences) "
                        f"suggests an established relationship or recurring deposit channel."
                    )

                    findings.append(
                        IntelligenceFinding(
                            finding_id=finding_id,
                            investigation_id=context.investigation_id,
                            type=FindingType.REPEATED_DESTINATION,
                            severity=FindingSeverity.MEDIUM,
                            title="Repeated Destination Flow",
                            description=f"{count} transactions transferred between {addr} and {dst_addr}.",
                            observed_fact=fact,
                            interpretation=interpretation,
                            confidence=0.85,
                            evidence_refs=[
                                EvidenceReference(
                                    type="WALLET",
                                    ref_id=addr,
                                    description="Source wallet",
                                ),
                                EvidenceReference(
                                    type="WALLET",
                                    ref_id=dst_addr,
                                    description=f"Recipient wallet receiving {count} recurring transfers",
                                ),
                            ],
                            rule_id=self.id,
                            rule_version=self.version,
                            metadata={"source": addr, "destination": dst_addr, "count": count},
                            created_at=now_str,
                        )
                    )

        return findings


# ==============================================================================
# 7. VELOCITY SPIKE RULE (Section 11)
# ==============================================================================


class VelocitySpikeRule(IntelligenceRule):
    """
    Detects unusual transaction bursts in a short time frame.
    Default threshold: >= 4 transactions within 1 hour.
    """

    id = "rule_velocity_spike"
    version = "1.0.0"
    name = "High Velocity Burst"
    description = "Detects acute transaction bursts within a rolling 1-hour window"

    def evaluate(self, context: RuleEvaluationContext) -> list[IntelligenceFinding]:
        findings: list[IntelligenceFinding] = []
        velocity_threshold = float(context.config.get("velocity_peak_threshold", 4.0))

        for addr, features in context.wallet_features.items():
            if features.transactions_per_hour_peak >= velocity_threshold:
                finding_id = f"find_vs_{uuid.uuid4().hex[:8]}"
                now_str = datetime.now(UTC).isoformat()

                fact = (
                    f"Wallet {addr} executed a burst of {features.transactions_per_hour_peak:.0f} "
                    f"transfers within a 1-hour rolling interval."
                )
                interpretation = (
                    f"Accelerated transfer velocity ({features.transactions_per_hour_peak:.0f} tx/hr) "
                    f"indicates batch or automated distribution behavior."
                )

                findings.append(
                    IntelligenceFinding(
                        finding_id=finding_id,
                        investigation_id=context.investigation_id,
                        type=FindingType.SUSPICIOUS_VELOCITY,
                        severity=FindingSeverity.MEDIUM,
                        title="High Transfer Velocity Detected",
                        description=f"Wallet reached a peak velocity of {features.transactions_per_hour_peak:.0f} tx/hr.",
                        observed_fact=fact,
                        interpretation=interpretation,
                        confidence=0.80,
                        evidence_refs=[
                            EvidenceReference(
                                type="WALLET",
                                ref_id=addr,
                                description=f"Wallet exhibiting burst velocity of {features.transactions_per_hour_peak:.0f} tx/hr",
                            )
                        ],
                        rule_id=self.id,
                        rule_version=self.version,
                        metadata={"peak_tph": features.transactions_per_hour_peak},
                        created_at=now_str,
                    )
                )

        return findings
