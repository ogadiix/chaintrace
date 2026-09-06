"""
Intelligence Rules Architecture & Base Interface
Standardized interface for deterministic pattern detection rules.
Source of truth: Master Prompt Phase 5 Sections 12, 13, 14, 15, 18
"""
from abc import ABC, abstractmethod
from typing import Any

from apps.api.src.models.intelligence import IntelligenceFinding, WalletFeatures
from apps.api.src.models.trace import TraceResult


class RuleEvaluationContext:
    """Carries complete investigative context to detection rules."""

    def __init__(
        self,
        investigation_id: str | None,
        trace_result: TraceResult,
        wallet_features: dict[str, WalletFeatures],
        config: dict[str, Any] | None = None,
    ):
        self.investigation_id = investigation_id
        self.trace_result = trace_result
        self.wallet_features = wallet_features
        self.config = config or {}


class IntelligenceRule(ABC):
    """Abstract Base Class for versioned intelligence pattern rules."""

    id: str
    version: str
    name: str
    description: str

    @abstractmethod
    def evaluate(self, context: RuleEvaluationContext) -> list[IntelligenceFinding]:
        """Evaluates rule logic against the investigative context and returns findings."""
