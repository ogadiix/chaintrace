"""
Intelligence Engine Orchestrator
Executes feature extraction and all active detection rules against trace results.
Source of truth: Master Prompt Phase 5 Sections 12, 13, 16, 17
"""
import asyncio
import logging
import time
import uuid
from datetime import UTC, datetime
from typing import Any

from apps.api.src.models.intelligence import (
    IntelligenceAnalysisResult,
    IntelligenceFinding,
    IntelligenceJob,
)
from apps.api.src.models.trace import TraceResult
from apps.api.src.services.intelligence.base import IntelligenceRule, RuleEvaluationContext
from apps.api.src.services.intelligence.features import FeatureExtractor
from apps.api.src.services.intelligence.rules import (
    HighFanInRule,
    HighFanOutRule,
    PeelChainRule,
    RapidForwardingRule,
    RepeatedDestinationRule,
    RoundAmountRule,
    VelocitySpikeRule,
)
from chaintrace_shared import FindingSeverity

logger = logging.getLogger(__name__)


class IntelligenceEngine:
    """Orchestrates feature extraction, rule dispatch, and finding aggregation."""

    def __init__(self, rules: list[IntelligenceRule] | None = None):
        self._rules = rules or [
            RapidForwardingRule(),
            HighFanOutRule(),
            HighFanInRule(),
            PeelChainRule(),
            RoundAmountRule(),
            RepeatedDestinationRule(),
            VelocitySpikeRule(),
        ]
        self._jobs: dict[str, IntelligenceJob] = {}
        self._lock = asyncio.Lock()

    def analyze(
        self,
        trace_result: TraceResult,
        investigation_id: str | None = None,
        config: dict[str, Any] | None = None,
    ) -> IntelligenceAnalysisResult:
        """Synchronously analyzes trace results and outputs structured findings."""
        start_time = time.monotonic()
        now_iso = datetime.now(UTC).isoformat()

        # 1. Extract wallet behavioral features
        wallet_features = FeatureExtractor.extract_features_from_trace(trace_result)

        # 2. Build evaluation context
        context = RuleEvaluationContext(
            investigation_id=investigation_id,
            trace_result=trace_result,
            wallet_features=wallet_features,
            config=config or {},
        )

        # 3. Execute all active rules
        all_findings: list[IntelligenceFinding] = []
        rules_executed: list[str] = []

        for rule in self._rules:
            try:
                findings = rule.evaluate(context)
                all_findings.extend(findings)
                rules_executed.append(f"{rule.id}@{rule.version}")
            except Exception:
                logger.exception("Error executing intelligence rule %s", rule.id)

        elapsed_ms = (time.monotonic() - start_time) * 1000.0

        # Calculate severity tallies
        severity_counts = {
            FindingSeverity.LOW: 0,
            FindingSeverity.MEDIUM: 0,
            FindingSeverity.HIGH: 0,
            FindingSeverity.CRITICAL: 0,
        }
        for f in all_findings:
            severity_counts[f.severity] = severity_counts.get(f.severity, 0) + 1

        statistics = {
            "total_findings": len(all_findings),
            "severity_counts": {k.value: v for k, v in severity_counts.items()},
            "rules_executed": len(rules_executed),
            "wallets_analyzed": len(wallet_features),
            "transactions_analyzed": len(trace_result.edges),
            "duration_ms": round(elapsed_ms, 2),
        }

        return IntelligenceAnalysisResult(
            investigation_id=investigation_id,
            findings=all_findings,
            statistics=statistics,
            rules_executed=rules_executed,
            analysis_timestamp=now_iso,
            engine_version="1.0.0",
        )

    async def create_job(
        self,
        investigation_id: str,
        trace_result: TraceResult,
        config: dict[str, Any] | None = None,
    ) -> IntelligenceJob:
        """Dispatches an asynchronous intelligence analysis job."""
        job_id = f"job_intel_{uuid.uuid4().hex[:12]}"
        now_str = datetime.now(UTC).isoformat()

        job = IntelligenceJob(
            id=job_id,
            investigation_id=investigation_id,
            status="QUEUED",
            findings_count=0,
            created_at=now_str,
            updated_at=now_str,
        )

        async with self._lock:
            self._jobs[job_id] = job

        # Run in background
        asyncio.create_task(self._run_job(job_id, trace_result, investigation_id, config))
        return job

    async def get_job(self, job_id: str) -> IntelligenceJob | None:
        async with self._lock:
            return self._jobs.get(job_id)

    async def _run_job(
        self,
        job_id: str,
        trace_result: TraceResult,
        investigation_id: str,
        config: dict[str, Any] | None,
    ) -> None:
        async with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].status = "RUNNING"
                self._jobs[job_id].updated_at = datetime.now(UTC).isoformat()

        try:
            result = self.analyze(trace_result, investigation_id=investigation_id, config=config)
            async with self._lock:
                if job_id in self._jobs:
                    self._jobs[job_id].status = "COMPLETED"
                    self._jobs[job_id].findings_count = len(result.findings)
                    self._jobs[job_id].result = result
                    self._jobs[job_id].updated_at = datetime.now(UTC).isoformat()
        except Exception:
            logger.exception("Intelligence analysis job %s failed", job_id)
            async with self._lock:
                if job_id in self._jobs:
                    self._jobs[job_id].status = "FAILED"
                    self._jobs[job_id].error_message = "Internal intelligence analysis failure"
                    self._jobs[job_id].updated_at = datetime.now(UTC).isoformat()


# Global Singleton
_intel_engine_instance: IntelligenceEngine | None = None


def get_intelligence_engine() -> IntelligenceEngine:
    global _intel_engine_instance
    if _intel_engine_instance is None:
        _intel_engine_instance = IntelligenceEngine()
    return _intel_engine_instance
