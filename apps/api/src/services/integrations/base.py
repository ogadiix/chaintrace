"""
Abstract Base Interfaces for NCRP and SAHYOG Adapters
Defines strict boundary abstractions allowing drop-in replacement with production government APIs.
Source of truth: Master Prompt Phase 10 Section 13, 24
"""

from abc import ABC, abstractmethod
from typing import Any

from apps.api.src.models.integration import SahyogRequest, SahyogResponse
from apps.api.src.schemas.integration import NcrpComplaintCreateSchema


class NCRPAdapter(ABC):
    """Abstract interface for ingesting complaints from the National Cybercrime Reporting Portal."""

    @abstractmethod
    def validate_complaint(self, payload: NcrpComplaintCreateSchema) -> tuple[bool, str | None]:
        """Validates syntactic and blockchain correctness of an incoming complaint."""

    @abstractmethod
    def get_sample_complaints(self) -> list[dict[str, Any]]:
        """Returns deterministic simulated complaint presets for hackathon demonstrations."""


class SAHYOGAdapter(ABC):
    """Abstract interface for coordinating VASP information and freeze requests via the I4C SAHYOG workflow."""

    @abstractmethod
    async def submit_request(self, request: SahyogRequest) -> SahyogResponse:
        """Transmits request to intermediary and returns deterministic evidence payload."""
