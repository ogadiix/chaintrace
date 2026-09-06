"""
Explainable Risk Engine
Combines trace topology, intelligence findings, and VASP attributions into a bounded,
explainable risk score [0-100]. Prevents double-counting by clustering related signals.
Source of truth: Master Prompt Phase 7 Sections 2-15, 18, 20
"""

import asyncio
import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from apps.api.src.models.attribution import AttributionAnalysisResult
from apps.api.src.models.intelligence import IntelligenceAnalysisResult
from apps.api.src.models.risk import (
    ManualRiskOverride,
    RiskAssessment,
    RiskSignalContribution,
)
from apps.api.src.models.trace import TraceResult
from chaintrace_shared import EntityType, FindingType, RiskLevel

logger = logging.getLogger(__name__)


# Default Configurable Signal Weights (Master Prompt Section 5)
DEFAULT_SIGNAL_WEIGHTS = {
    "RAPID_FORWARDING": 20,
    "HIGH_FAN_OUT": 12,
    "HIGH_FAN_IN": 12,
    "PEEL_CHAIN": 22,
    "REPEATED_DESTINATION": 8,
    "SUSPICIOUS_VELOCITY": 10,
    "ROUND_AMOUNT_PATTERN": 5,
    "SANCTIONED_ENTITY_INTERACTION": 45,
    "KNOWN_MIXER_INTERACTION": 30,
    "KNOWN_SCAM_INTERACTION": 35,
    "KNOWN_BRIDGE_INTERACTION": 5,
}

# Signal Grouping to Prevent Double Counting (Section 8)
# Maps signal to category and category cap
CATEGORY_CAPS = {
    "VELOCITY_LAYER": 25,  # Combines RAPID_FORWARDING + SUSPICIOUS_VELOCITY
    "DISPERSION_LAYER": 22,  # Combines HIGH_FAN_OUT + HIGH_FAN_IN + PEEL_CHAIN
    "RECURRENCE_LAYER": 10,  # Combines REPEATED_DESTINATION + ROUND_AMOUNT_PATTERN
    "ENTITY_RISK_LAYER": 50,  # Combines SANCTIONED_ENTITY + MIXER + SCAM
}

SIGNAL_CATEGORIES = {
    "RAPID_FORWARDING": "VELOCITY_LAYER",
    "SUSPICIOUS_VELOCITY": "VELOCITY_LAYER",
    "HIGH_FAN_OUT": "DISPERSION_LAYER",
    "HIGH_FAN_IN": "DISPERSION_LAYER",
    "PEEL_CHAIN": "DISPERSION_LAYER",
    "REPEATED_DESTINATION": "RECURRENCE_LAYER",
    "ROUND_AMOUNT_PATTERN": "RECURRENCE_LAYER",
    "SANCTIONED_ENTITY_INTERACTION": "ENTITY_RISK_LAYER",
    "KNOWN_MIXER_INTERACTION": "ENTITY_RISK_LAYER",
    "KNOWN_SCAM_INTERACTION": "ENTITY_RISK_LAYER",
    "KNOWN_BRIDGE_INTERACTION": "ENTITY_RISK_LAYER",
}


def score_to_risk_level(score: int, thresholds: dict[str, int] | None = None) -> RiskLevel:
    """Centralized score-to-level mapping (Section 7)."""
    t = thresholds or {"LOW_MAX": 24, "MEDIUM_MAX": 49, "HIGH_MAX": 74}
    if score <= t["LOW_MAX"]:
        return RiskLevel.LOW
    elif score <= t["MEDIUM_MAX"]:
        return RiskLevel.MEDIUM
    elif score <= t["HIGH_MAX"]:
        return RiskLevel.HIGH
    return RiskLevel.CRITICAL


class RiskEngine:
    """
    Explainable Risk Engine.
    Aggregates signals from TraceEngine, IntelligenceEngine, and AttributionService.
    Guarantees strict scoring bounds [0-100], anti-double-counting, and audit reproducibility.
    """

    ENGINE_VERSION = "1.0.0"

    def __init__(self):
        self._history: dict[str, list[RiskAssessment]] = {}
        self._lock = asyncio.Lock()

    def determine_risk_level(
        self, score: int, thresholds: dict[str, int] | None = None
    ) -> RiskLevel:
        return score_to_risk_level(score, thresholds)

    def evaluate_risk(
        self,
        investigation_id: str,
        seed_wallet: str,
        trace_result: TraceResult | None,
        intel_result: IntelligenceAnalysisResult | None,
        attr_result: AttributionAnalysisResult | None,
        config: dict[str, Any] | None = None,
    ) -> RiskAssessment:
        """
        Executes deterministic, explainable risk assessment.
        Combines intelligence findings and attribution signals with category caps.
        """
        assessment_id = f"risk_assess_{uuid.uuid4().hex[:12]}"
        now_str = datetime.now(UTC).isoformat()
        weights = (
            config.get("weights", DEFAULT_SIGNAL_WEIGHTS) if config else DEFAULT_SIGNAL_WEIGHTS
        )
        cat_caps = config.get("category_caps", CATEGORY_CAPS) if config else CATEGORY_CAPS

        contributions: list[RiskSignalContribution] = []
        category_running_totals: dict[str, int] = {k: 0 for k in cat_caps}
        all_evidence: list[dict[str, Any]] = []

        # 1. Process Intelligence Findings (Phase 5)
        if intel_result and intel_result.findings:
            # Deduplicate by finding type to avoid counting 5 identical rapid forwarding findings 5 times
            findings_by_type: dict[FindingType, list] = {}
            for f in intel_result.findings:
                findings_by_type.setdefault(f.type, []).append(f)

            for f_type, f_list in findings_by_type.items():
                signal_name = f_type.value
                raw_weight = weights.get(signal_name, 10)
                category = SIGNAL_CATEGORIES.get(signal_name, "GENERAL")

                # Apply anti-double-counting category capping
                current_cat_total = category_running_totals.get(category, 0)
                cap = cat_caps.get(category, 30)
                remaining_allowance = max(0, cap - current_cat_total)
                effective_weight = min(raw_weight, remaining_allowance)

                category_running_totals[category] = current_cat_total + effective_weight

                # Aggregate evidence
                ev_refs = []
                for f in f_list:
                    for ev in f.evidence_refs:
                        ev_dict = ev.model_dump() if hasattr(ev, "model_dump") else dict(ev)
                        ev_refs.append(ev_dict)
                        all_evidence.append(ev_dict)

                reason = (
                    f"{len(f_list)} instance(s) of {signal_name.replace('_', ' ').title()} observed. "
                    f"{f_list[0].description}"
                )

                contributions.append(
                    RiskSignalContribution(
                        signal=signal_name,
                        category=category,
                        raw_weight=raw_weight,
                        effective_weight=effective_weight,
                        weight=effective_weight,
                        source="INTELLIGENCE_ENGINE",
                        reason=reason,
                        evidence_refs=ev_refs[:10],
                        metadata={"count": len(f_list)},
                    )
                )

        # 2. Process VASP & Entity Attribution Signals (Phase 6)
        if attr_result and attr_result.attributions:
            for item in attr_result.attributions:
                entity = item.entity
                if not entity:
                    continue

                sig_name = None
                reason_text = None

                if entity.entity_type == EntityType.SANCTIONED_ENTITY:
                    sig_name = "SANCTIONED_ENTITY_INTERACTION"
                    reason_text = f"Interaction with sanctioned entity {entity.name} (Source: {entity.source})"
                elif entity.entity_type == EntityType.MIXER:
                    sig_name = "KNOWN_MIXER_INTERACTION"
                    reason_text = (
                        f"Interaction with mixer service {entity.name} (Source: {entity.source})"
                    )
                elif entity.entity_type == EntityType.SCAM:
                    sig_name = "KNOWN_SCAM_INTERACTION"
                    reason_text = f"Interaction with reported scam/fraud entity {entity.name}"
                elif entity.entity_type == EntityType.BRIDGE:
                    sig_name = "KNOWN_BRIDGE_INTERACTION"
                    reason_text = f"Interaction with cross-chain bridge {entity.name}"

                # Note: Legitimate regulated exchanges (EXCHANGE, VASP) do NOT trigger suspicious risk penalties
                if sig_name:
                    raw_weight = weights.get(sig_name, 20)
                    category = SIGNAL_CATEGORIES.get(sig_name, "ENTITY_RISK_LAYER")
                    current_cat_total = category_running_totals.get(category, 0)
                    cap = cat_caps.get(category, 50)
                    remaining = max(0, cap - current_cat_total)
                    effective_weight = min(raw_weight, remaining)
                    category_running_totals[category] = current_cat_total + effective_weight

                    ev_list = [
                        {
                            "type": "WALLET_LABEL",
                            "address": item.wallet,
                            "entity": entity.name,
                            "source": entity.source,
                        }
                    ]
                    all_evidence.extend(ev_list)

                    contributions.append(
                        RiskSignalContribution(
                            signal=sig_name,
                            category=category,
                            raw_weight=raw_weight,
                            effective_weight=effective_weight,
                            weight=effective_weight,
                            source=entity.source or "VASP_ATTRIBUTION",
                            reason=reason_text,
                            evidence_refs=ev_list,
                            metadata={"wallet": item.wallet, "entity": entity.name},
                        )
                    )

        # 3. Sum Bounded Score [0-100] (Section 6)
        raw_score_sum = sum(c.effective_weight for c in contributions)
        final_score = min(max(raw_score_sum, 0), 100)
        risk_level = score_to_risk_level(final_score)

        # 4. Generate Human-Readable Reasoning Bullets (Section 15)
        # Sort contributions by effective impact
        contributions.sort(key=lambda c: c.effective_weight, reverse=True)
        reasons: list[str] = []
        for c in contributions:
            if c.effective_weight > 0:
                reasons.append(f"+{c.effective_weight} pts: {c.reason}")

        if not reasons:
            reasons.append("No anomalous flow patterns or high-risk entity interactions observed.")

        assessment = RiskAssessment(
            assessment_id=assessment_id,
            investigation_id=investigation_id,
            seed_wallet=seed_wallet,
            score=final_score,
            risk_level=risk_level,
            contributions=contributions,
            reasons=reasons,
            evidence=all_evidence,
            evidence_refs=all_evidence,
            manual_override=None,
            engine_version=self.ENGINE_VERSION,
            intelligence_engine_version="1.0.0",
            attribution_dataset_version="vasp_labels_v1",
            created_at=now_str,
            updated_at=now_str,
        )

        return assessment

    async def record_assessment(self, assessment: RiskAssessment) -> None:
        """Stores assessment into historical investigation timeline."""
        async with self._lock:
            inv_id = assessment.investigation_id
            if inv_id not in self._history:
                self._history[inv_id] = []
            self._history[inv_id].append(assessment)

    async def get_latest_assessment(self, investigation_id: str) -> RiskAssessment | None:
        async with self._lock:
            assessments = self._history.get(investigation_id, [])
            return assessments[-1] if assessments else None

    async def get_assessment_history(self, investigation_id: str) -> list[RiskAssessment]:
        async with self._lock:
            return list(self._history.get(investigation_id, []))

    async def apply_manual_override(
        self,
        investigation_id: str,
        user_id: str,
        override_level: RiskLevel,
        reason: str,
    ) -> RiskAssessment | None:
        """Applies manual investigator classification without destroying automated score (Section 20)."""
        async with self._lock:
            assessments = self._history.get(investigation_id, [])
            if not assessments:
                return None
            latest = assessments[-1]
            now_str = datetime.now(UTC).isoformat()

            latest.manual_override = ManualRiskOverride(
                overridden_by=user_id,
                overridden_at=now_str,
                original_level=latest.risk_level,
                override_level=override_level,
                reason=reason,
            )
            latest.updated_at = now_str
            return latest


# Global Singleton
_risk_engine_instance: RiskEngine | None = None


def get_risk_engine() -> RiskEngine:
    global _risk_engine_instance
    if _risk_engine_instance is None:
        _risk_engine_instance = RiskEngine()
    return _risk_engine_instance
