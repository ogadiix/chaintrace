"""
VASP & Entity Attribution Service
Loads versioned label datasets, indexes multi-chain wallets, handles label conflicts,
and evaluates exact-match and path-endpoint attributions with explainable confidence.
Source of truth: Master Prompt Phase 6 Sections 2-13, 17, 21, 22
"""
import asyncio
import json
import logging
import os
from collections import defaultdict
from datetime import UTC, datetime

from apps.api.src.models.attribution import (
    AttributionAnalysisResult,
    VaspEntity,
    WalletAttribution,
    WalletLabel,
)
from apps.api.src.models.trace import TraceResult
from chaintrace_shared import (
    AttributionConfidence,
    AttributionStatus,
    BlockchainType,
    EntityType,
    is_valid_address,
)

logger = logging.getLogger(__name__)


def make_label_key(chain: str, address: str) -> str:
    """Multi-chain composite key to guarantee cross-chain address isolation."""
    return f"{chain.lower().strip()}:{address.strip()}"


class AttributionService:
    """
    Core Attribution Engine.
    Evaluates wallet addresses against curated, versioned entity labels with source provenance.
    Never asserts legal guilt or fabricates unverified claims.
    """

    DATASET_VERSION = "vasp_labels_v1"
    ENGINE_VERSION = "1.0.0"

    def __init__(self, seed_dataset_path: str | None = None):
        self._entities: dict[str, VaspEntity] = {}
        # One address can map to multiple labels (conflict detection)
        self._labels_by_key: dict[str, list[WalletLabel]] = defaultdict(list)
        self._lock = asyncio.Lock()
        self._initialized = False
        self._seed_path = seed_dataset_path or os.path.join(os.getcwd(), "data", "vasp_labels_v1.json")

    async def initialize(self) -> None:
        """Loads and indexes the seed VASP label dataset."""
        if self._initialized:
            return

        async with self._lock:
            if self._initialized:
                return

            if os.path.exists(self._seed_path):
                try:
                    def _read_seed():
                        with open(self._seed_path, encoding="utf-8") as f:
                            return json.load(f)

                    records = await asyncio.to_thread(_read_seed)

                    for rec in records:
                        chain_str = rec.get("chain", "").lower()
                        address_str = rec.get("address", "").strip()

                        # Validate address syntax
                        if not is_valid_address(chain_str, address_str) and not rec.get("is_demo"):
                            logger.warning("Skipping invalid address in seed dataset: %s on %s", address_str, chain_str)
                            continue

                        chain_enum = BlockchainType(chain_str)
                        entity_type = EntityType(rec.get("entity_type", "OTHER"))
                        conf = AttributionConfidence(rec.get("confidence", "CONFIRMED"))

                        # Entity index
                        entity_id = rec["entity_id"]
                        if entity_id not in self._entities:
                            now = datetime.now(UTC).isoformat()
                            self._entities[entity_id] = VaspEntity(
                                entity_id=entity_id,
                                name=rec.get("entity_name", entity_id),
                                entity_type=entity_type,
                                jurisdiction=rec.get("jurisdiction"),
                                status="ACTIVE",
                                source=rec.get("source", "PUBLIC_DISCLOSURE"),
                                source_url=rec.get("source_reference"),
                                confidence=conf,
                                created_at=now,
                                updated_at=now,
                            )

                        # Label record
                        label = WalletLabel(
                            chain=chain_enum,
                            address=address_str,
                            entity_id=entity_id,
                            label_type=rec.get("label_type", "HOT_WALLET"),
                            confidence=conf,
                            source=rec.get("source", "PUBLIC_DISCLOSURE"),
                            source_reference=rec.get("source_reference"),
                            is_demo=bool(rec.get("is_demo", False)),
                            notes=rec.get("notes"),
                        )

                        key = make_label_key(chain_str, address_str)
                        self._labels_by_key[key].append(label)

                    logger.info(
                        "AttributionService loaded %d labels across %d entities from %s",
                        sum(len(v) for v in self._labels_by_key.values()),
                        len(self._entities),
                        self._seed_path,
                    )
                except Exception:
                    logger.exception("Failed to load attribution seed dataset")

            self._initialized = True

    async def add_label(self, label: WalletLabel, entity: VaspEntity | None = None) -> None:
        """Idempotently adds or updates an entity label with provenance."""
        await self.initialize()
        async with self._lock:
            if entity and entity.entity_id not in self._entities:
                self._entities[entity.entity_id] = entity

            key = make_label_key(label.chain.value, label.address)
            # Avoid duplicate exact records
            existing = self._labels_by_key[key]
            if not any(l.entity_id == label.entity_id and l.source == label.source for l in existing):
                existing.append(label)

    async def attribute_wallet(
        self,
        chain: str,
        address: str,
        attributed_via: str = "EXACT_MATCH",
    ) -> WalletAttribution:
        """
        Attribution lookup for a single wallet address.
        Handles:
        1. Exact Match -> MATCHED
        2. Multiple divergent entity sources -> CONFLICTING_LABELS
        3. No matching records -> UNKNOWN
        """
        await self.initialize()
        clean_chain = chain.lower().strip()
        clean_addr = address.strip()
        key = make_label_key(clean_chain, clean_addr)

        labels = self._labels_by_key.get(key, [])

        if not labels:
            return WalletAttribution(
                wallet=clean_addr,
                chain=BlockchainType(clean_chain),
                status=AttributionStatus.UNKNOWN,
                entity=None,
                confidence=AttributionConfidence.UNKNOWN,
                confidence_score=0.0,
                confidence_reasons=["No supported public or curated label matched this address"],
                evidence=[],
                labels=[],
                dataset_version=self.DATASET_VERSION,
                attributed_via="NONE",
            )

        # Check for conflicting entities
        distinct_entity_ids = {l.entity_id for l in labels}
        if len(distinct_entity_ids) > 1:
            conflicting_entities = [self._entities.get(eid) for eid in distinct_entity_ids if eid in self._entities]
            return WalletAttribution(
                wallet=clean_addr,
                chain=BlockchainType(clean_chain),
                status=AttributionStatus.CONFLICTING_LABELS,
                entity=conflicting_entities[0] if conflicting_entities else None,
                confidence=AttributionConfidence.POSSIBLE,
                confidence_score=0.45,
                confidence_reasons=[
                    f"Conflicting labels detected across {len(distinct_entity_ids)} different entities: {list(distinct_entity_ids)}",
                    "Multiple independent sources disagree on entity ownership",
                ],
                evidence=[
                    {"source": l.source, "entity_id": l.entity_id, "ref": l.source_reference}
                    for l in labels
                ],
                labels=labels,
                dataset_version=self.DATASET_VERSION,
                attributed_via=attributed_via,
            )

        # Exactly one entity matches
        matched_label = labels[0]
        entity = self._entities.get(matched_label.entity_id)

        # Calculate explainable confidence
        reasons: list[str] = []
        score = 0.50

        if attributed_via == "EXACT_MATCH":
            score += 0.40
            reasons.append("Exact blockchain address match against verified directory")
        elif attributed_via == "PATH_ENDPOINT":
            score += 0.30
            reasons.append("Traced money path terminated at this exact labeled destination")

        if len(labels) > 1:
            score += 0.05
            reasons.append(f"Corroborated by {len(labels)} independent label records")

        if matched_label.is_demo:
            reasons.append("[DEMO DATA] Labeled for demonstration scenario")
            conf_enum = AttributionConfidence.CONFIRMED
        elif matched_label.source in ("OFAC", "PUBLIC_DISCLOSURE"):
            score += 0.05
            reasons.append(f"Attribution verified via authoritative source: {matched_label.source}")
            conf_enum = AttributionConfidence.CONFIRMED
        else:
            conf_enum = AttributionConfidence.PROBABLE

        score = min(score, 1.0)

        evidence = [
            {
                "type": "WALLET_LABEL",
                "entity_name": entity.name if entity else matched_label.entity_id,
                "label_type": matched_label.label_type,
                "source": matched_label.source,
                "reference": matched_label.source_reference,
            }
        ]

        return WalletAttribution(
            wallet=clean_addr,
            chain=BlockchainType(clean_chain),
            status=AttributionStatus.MATCHED,
            entity=entity,
            confidence=conf_enum,
            confidence_score=round(score, 2),
            confidence_reasons=reasons,
            evidence=evidence,
            labels=labels,
            dataset_version=self.DATASET_VERSION,
            attributed_via=attributed_via,
        )

    async def analyze_trace_attributions(
        self,
        trace_result: TraceResult,
        investigation_id: str | None = None,
    ) -> AttributionAnalysisResult:
        """
        Analyzes all terminal wallets and unique addresses discovered in an investigation trace.
        Prioritizes path terminal endpoints as potential liquidation/cash-out venues.
        """
        await self.initialize()
        now_str = datetime.now(UTC).isoformat()
        seed_addr = trace_result.seed.get("address", "")
        chain_str = trace_result.seed.get("chain", "tron")

        # 1. Identify terminal wallets
        terminal_wallets: set[str] = set()
        for path in trace_result.paths:
            if path.terminal_wallet:
                terminal_wallets.add(path.terminal_wallet)
        for term in trace_result.terminals:
            if term.wallet:
                terminal_wallets.add(term.wallet)

        # 2. Identify all other wallets in trace
        all_wallets: set[str] = set(terminal_wallets)
        for node in trace_result.nodes:
            props = node.get("properties", {})
            addr = props.get("address")
            if addr:
                all_wallets.add(addr)

        # Evaluate terminal wallets (attributed as PATH_ENDPOINT)
        terminal_attributions: list[WalletAttribution] = []
        for term_addr in terminal_wallets:
            attr = await self.attribute_wallet(
                chain=chain_str,
                address=term_addr,
                attributed_via="PATH_ENDPOINT",
            )
            terminal_attributions.append(attr)

        # Evaluate all wallets
        all_attributions: list[WalletAttribution] = []
        matched_count = 0
        unknown_count = 0
        conflict_count = 0

        for addr in all_wallets:
            attr = await self.attribute_wallet(
                chain=chain_str,
                address=addr,
                attributed_via="PATH_ENDPOINT" if addr in terminal_wallets else "EXACT_MATCH",
            )
            all_attributions.append(attr)

            if attr.status == AttributionStatus.MATCHED:
                matched_count += 1
            elif attr.status == AttributionStatus.CONFLICTING_LABELS:
                conflict_count += 1
            else:
                unknown_count += 1

        # Sort: MATCHED first, then CONFLICTING, then UNKNOWN
        status_priority = {
            AttributionStatus.MATCHED: 0,
            AttributionStatus.CONFLICTING_LABELS: 1,
            AttributionStatus.UNKNOWN: 2,
        }
        all_attributions.sort(key=lambda a: status_priority.get(a.status, 3))
        terminal_attributions.sort(key=lambda a: status_priority.get(a.status, 3))

        return AttributionAnalysisResult(
            investigation_id=investigation_id,
            seed_wallet=seed_addr,
            matched_count=matched_count,
            unknown_count=unknown_count,
            conflict_count=conflict_count,
            attributions=all_attributions,
            terminal_attributions=terminal_attributions,
            dataset_version=self.DATASET_VERSION,
            engine_version=self.ENGINE_VERSION,
            analyzed_at=now_str,
        )


# Global Service Singleton
_attribution_service_instance: AttributionService | None = None


def get_attribution_service() -> AttributionService:
    global _attribution_service_instance
    if _attribution_service_instance is None:
        _attribution_service_instance = AttributionService()
    return _attribution_service_instance
