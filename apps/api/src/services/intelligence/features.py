"""
Intelligence Feature Extraction Layer
Aggregates graph topology, transfer timings, and amount distributions into structured features.
All monetary calculations preserve exact decimal precision without IEEE 754 floating-point errors.
Source of truth: Master Prompt Phase 5 Section 4
"""

from collections import defaultdict
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from apps.api.src.models.intelligence import WalletFeatures
from apps.api.src.models.trace import TraceResult


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
        # Standardize ISO format
        cleaned = ts_str.replace("Z", "+00:00")
        return datetime.fromisoformat(cleaned)
    except Exception:
        return None


class FeatureExtractor:
    """Extracts behavioral and graph features for wallets and flows."""

    @classmethod
    def extract_wallet_features(
        cls,
        wallet_address: str,
        chain: str,
        edges: list[dict[str, Any]],
    ) -> WalletFeatures:
        """Calculates flow distribution, intervals, and velocity for a specific wallet address."""
        clean_addr = wallet_address.strip()
        clean_chain = chain.lower().strip()

        incoming_txs: list[dict[str, Any]] = []
        outgoing_txs: list[dict[str, Any]] = []

        for edge in edges:
            if edge.get("type") != "transfer":
                continue
            props = edge.get("properties", {})
            src_addr = edge.get("source", "")
            dst_addr = edge.get("target", "")

            # Strip chain prefix if present
            if ":" in src_addr:
                src_addr = src_addr.split(":", 1)[1]
            if ":" in dst_addr:
                dst_addr = dst_addr.split(":", 1)[1]

            if src_addr == clean_addr:
                outgoing_txs.append(props)
            if dst_addr == clean_addr:
                incoming_txs.append(props)

        # Sum total amounts
        total_in = sum((_parse_dec(tx.get("amount", 0)) for tx in incoming_txs), Decimal(0))
        total_out = sum((_parse_dec(tx.get("amount", 0)) for tx in outgoing_txs), Decimal(0))

        # Destination counting
        dest_counts: dict[str, int] = defaultdict(int)
        for edge in edges:
            if edge.get("type") != "transfer":
                continue
            src_addr = edge.get("source", "")
            dst_addr = edge.get("target", "")
            if ":" in src_addr:
                src_addr = src_addr.split(":", 1)[1]
            if ":" in dst_addr:
                dst_addr = dst_addr.split(":", 1)[1]

            if src_addr == clean_addr:
                dest_counts[dst_addr] += 1

        # Sources counting
        src_set: set[str] = set()
        for edge in edges:
            if edge.get("type") != "transfer":
                continue
            src_addr = edge.get("source", "")
            dst_addr = edge.get("target", "")
            if ":" in src_addr:
                src_addr = src_addr.split(":", 1)[1]
            if ":" in dst_addr:
                dst_addr = dst_addr.split(":", 1)[1]

            if dst_addr == clean_addr:
                src_set.add(src_addr)

        # Round amount calculation (e.g. 1000, 5000, 10000)
        round_count = 0
        all_txs = incoming_txs + outgoing_txs
        for tx in all_txs:
            amt = _parse_dec(tx.get("amount", 0))
            if amt > 0 and amt % Decimal(100) == 0:
                round_count += 1
        round_ratio = round_count / len(all_txs) if all_txs else 0.0

        # Transfer intervals calculation
        intervals_sec: list[float] = []
        timestamps: list[datetime] = []
        for tx in all_txs:
            dt = _parse_iso(tx.get("timestamp", ""))
            if dt:
                timestamps.append(dt)

        timestamps.sort()
        for i in range(1, len(timestamps)):
            delta = (timestamps[i] - timestamps[i - 1]).total_seconds()
            if delta >= 0:
                intervals_sec.append(delta)

        min_interval = min(intervals_sec) if intervals_sec else None
        avg_interval = (sum(intervals_sec) / len(intervals_sec)) if intervals_sec else None

        # Velocity peak: maximum transactions within any 1-hour rolling window
        peak_tph = 0.0
        if len(timestamps) >= 2:
            for i in range(len(timestamps)):
                t_start = timestamps[i]
                count_in_window = sum(
                    1 for t in timestamps if 0 <= (t - t_start).total_seconds() <= 3600
                )
                if count_in_window > peak_tph:
                    peak_tph = float(count_in_window)
        elif len(timestamps) == 1:
            peak_tph = 1.0

        return WalletFeatures(
            wallet_address=clean_addr,
            chain=clean_chain,
            incoming_tx_count=len(incoming_txs),
            outgoing_tx_count=len(outgoing_txs),
            total_tx_count=len(all_txs),
            total_incoming_amount=str(total_in),
            total_outgoing_amount=str(total_out),
            unique_sources=list(src_set),
            unique_destinations=list(dest_counts.keys()),
            fan_in=len(src_set),
            fan_out=len(dest_counts),
            min_transfer_interval_sec=min_interval,
            avg_transfer_interval_sec=avg_interval,
            round_amount_ratio=round(round_ratio, 3),
            transactions_per_hour_peak=peak_tph,
            repeated_destinations=dict(dest_counts),
        )

    @classmethod
    def extract_features_from_trace(
        cls,
        trace_result: TraceResult,
    ) -> dict[str, WalletFeatures]:
        """Extracts features for all distinct wallets observed in a trace result."""
        edges = trace_result.edges
        distinct_wallets: set[tuple[str, str]] = set()

        for edge in edges:
            chain = edge.get("properties", {}).get("chain", trace_result.seed.get("chain", "tron"))
            src = edge.get("source", "")
            dst = edge.get("target", "")
            if ":" in src:
                src = src.split(":", 1)[1]
            if ":" in dst:
                dst = dst.split(":", 1)[1]
            if src:
                distinct_wallets.add((chain, src))
            if dst:
                distinct_wallets.add((chain, dst))

        results: dict[str, WalletFeatures] = {}
        for chain, addr in distinct_wallets:
            features = cls.extract_wallet_features(wallet_address=addr, chain=chain, edges=edges)
            results[addr] = features

        return results
