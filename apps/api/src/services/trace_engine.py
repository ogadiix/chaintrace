"""
N-Hop Trace Traversal Engine
Executes bounded breadth-first traversal (BFS) with strict safety controls,
high-precision Decimal threshold filtering, asset segregation, and per-path cycle prevention.
Supports both direct Neo4j Cypher and InMemoryGraphStore execution.
Source of truth: Master Prompt Phase 4 Sections 4-12, 18-20
"""

import logging
import time
import uuid
from decimal import Decimal, InvalidOperation
from typing import Any

from apps.api.src.core.config import settings
from apps.api.src.core.in_memory_graph import (
    InMemoryGraphStore,
    get_in_memory_graph_store,
    make_wallet_id,
)
from apps.api.src.core.neo4j import get_neo4j_driver
from apps.api.src.models.trace import (
    TerminalNodeInfo,
    TraceHop,
    TracePath,
    TraceRequest,
    TraceResult,
    TraceStatistics,
)
from chaintrace_shared import BlockchainType, JobStatus, TerminalReason, TraceDirection

logger = logging.getLogger(__name__)


def _parse_amount(amt: Any) -> Decimal:
    if amt is None:
        return Decimal(0)
    try:
        return Decimal(str(amt).strip())
    except (InvalidOperation, ValueError):
        return Decimal(0)


class TraceEngine:
    """
    Forensic Traversal Engine.
    Traces fund movements outwards (or backwards) from a seed wallet address.
    """

    def __init__(self, in_memory_store: InMemoryGraphStore | None = None):
        self._in_memory = in_memory_store or get_in_memory_graph_store()

    async def execute_trace(
        self,
        request: TraceRequest,
        investigation_id: str | None = None,
        job_id: str | None = None,
    ) -> TraceResult:
        """
        Executes bounded traversal with defensive parameter validation and safety cutoff guards.
        """
        start_time = time.monotonic()
        clean_chain = request.chain.value.lower().strip()
        clean_seed = request.seed_wallet.strip()

        # Enforce authoritative backend limits
        effective_hops = min(request.max_hops, settings.ABSOLUTE_MAX_HOPS)
        effective_nodes_limit = min(request.max_nodes, settings.MAX_NODES_PER_JOB)
        effective_edges_limit = settings.MAX_EDGES_PER_JOB

        min_amt_dec = _parse_amount(request.minimum_amount) if request.minimum_amount else None

        # Check Neo4j availability
        driver = get_neo4j_driver()
        use_neo4j = False
        if driver is not None:
            try:
                await driver.verify_connectivity()
                use_neo4j = True
            except Exception:
                use_neo4j = False

        if use_neo4j and driver is not None:
            try:
                result = await self._traverse_neo4j(
                    driver=driver,
                    chain=clean_chain,
                    seed=clean_seed,
                    max_hops=effective_hops,
                    min_amount=min_amt_dec,
                    asset=request.asset,
                    token_contract=request.token_contract,
                    start_time=request.start_time,
                    end_time=request.end_time,
                    direction=request.direction,
                    max_nodes_limit=effective_nodes_limit,
                    max_edges_limit=effective_edges_limit,
                    max_paths_limit=request.max_paths,
                    timeout_sec=settings.TRACE_TIMEOUT_SECONDS,
                )
                result.investigation_id = investigation_id
                result.job_id = job_id
                result.configuration = request
                return result
            except Exception as exc:
                logger.warning(
                    "Neo4j trace failed (%s). Falling back to in-memory trace engine.", exc
                )

        # In-memory execution
        result = await self._traverse_in_memory(
            chain=clean_chain,
            seed=clean_seed,
            max_hops=effective_hops,
            min_amount=min_amt_dec,
            asset=request.asset,
            token_contract=request.token_contract,
            start_time=request.start_time,
            end_time=request.end_time,
            direction=request.direction,
            max_nodes_limit=effective_nodes_limit,
            max_edges_limit=effective_edges_limit,
            max_paths_limit=request.max_paths,
        )

        elapsed = (time.monotonic() - start_time) * 1000.0
        result.investigation_id = investigation_id
        result.job_id = job_id
        result.configuration = request
        result.statistics.duration_ms = round(elapsed, 2)
        return result

    async def _traverse_in_memory(
        self,
        chain: str,
        seed: str,
        max_hops: int,
        min_amount: Decimal | None,
        asset: str | None,
        token_contract: str | None,
        start_time: str | None,
        end_time: str | None,
        direction: TraceDirection,
        max_nodes_limit: int,
        max_edges_limit: int,
        max_paths_limit: int,
    ) -> TraceResult:
        """
        In-memory traversal across stored property graph edges.
        """
        seed_id = make_wallet_id(chain, seed)
        raw_edges = self._in_memory._edges
        raw_nodes = self._in_memory._nodes

        discovered_nodes: dict[str, dict[str, Any]] = {}
        discovered_edges: dict[str, dict[str, Any]] = {}
        discovered_paths: list[TracePath] = []
        terminals: list[TerminalNodeInfo] = []

        if seed_id in raw_nodes:
            discovered_nodes[seed_id] = raw_nodes[seed_id]
        else:
            discovered_nodes[seed_id] = {
                "id": seed_id,
                "type": "wallet",
                "label": seed[:8] + "..." if len(seed) > 12 else seed,
                "chain": chain,
                "properties": {"address": seed, "chain": chain},
            }

        # Queue items: (current_wallet_id, current_hop_number, list_of_hops_so_far, visited_wallets_in_path)
        queue: list[tuple[str, int, list[TraceHop], set[str]]] = [(seed_id, 0, [], {seed_id})]
        safety_limit_reached = False

        while queue:
            if (
                len(discovered_paths) >= max_paths_limit
                or len(discovered_nodes) >= max_nodes_limit
                or len(discovered_edges) >= max_edges_limit
            ):
                safety_limit_reached = True
                break

            curr_wallet_id, hop_level, path_hops, path_visited = queue.pop(0)
            curr_address = (
                curr_wallet_id.split(":", 1)[1] if ":" in curr_wallet_id else curr_wallet_id
            )

            if hop_level >= max_hops:
                discovered_paths.append(
                    TracePath(
                        path_id=f"path_{len(discovered_paths) + 1}_{uuid.uuid4().hex[:6]}",
                        hops=path_hops,
                        total_amount=str(
                            sum((_parse_amount(h.amount) for h in path_hops), Decimal(0))
                        ),
                        terminal_wallet=curr_address,
                        terminal_reason=TerminalReason.MAX_HOPS_REACHED,
                    )
                )
                terminals.append(
                    TerminalNodeInfo(
                        wallet=curr_address,
                        reason=TerminalReason.MAX_HOPS_REACHED,
                        hop_level=hop_level,
                    )
                )
                continue

            # Candidate transfers connected to curr_wallet_id
            qualifying_candidates: list[dict[str, Any]] = []
            unfiltered_transfers_count = 0
            below_amount_count = 0
            outside_time_count = 0

            for edge in raw_edges.values():
                if edge["type"] != "transfer":
                    continue

                is_match = False
                if (
                    direction == TraceDirection.FORWARD
                    and edge["source"] == curr_wallet_id
                    or direction == TraceDirection.BACKWARD
                    and edge["target"] == curr_wallet_id
                    or direction == TraceDirection.BOTH
                    and (edge["source"] == curr_wallet_id or edge["target"] == curr_wallet_id)
                ):
                    is_match = True

                if not is_match:
                    continue

                unfiltered_transfers_count += 1
                props = edge.get("properties", {})
                edge_chain = props.get("chain", "").lower()
                if edge_chain and edge_chain != chain:
                    continue

                # Asset segregation
                if asset:
                    edge_asset = props.get("asset", "").upper()
                    if edge_asset != asset.strip().upper():
                        continue

                # Token contract filter
                if token_contract:
                    edge_contract = props.get("token_contract")
                    if edge_contract and edge_contract.lower() != token_contract.strip().lower():
                        continue

                # Decimal amount filter
                edge_amt = _parse_amount(props.get("amount", "0"))
                if min_amount is not None and edge_amt < min_amount:
                    below_amount_count += 1
                    continue

                # Time window filter
                ts = props.get("timestamp", "")
                if start_time and ts < start_time:
                    outside_time_count += 1
                    continue
                if end_time and ts > end_time:
                    outside_time_count += 1
                    continue

                qualifying_candidates.append(edge)

            # If no qualifying candidates found, evaluate terminal reason
            if not qualifying_candidates:
                reason = TerminalReason.NO_OUTGOING_TRANSFERS
                details = None
                if unfiltered_transfers_count > 0:
                    if below_amount_count > 0 and len(qualifying_candidates) == 0:
                        reason = TerminalReason.BELOW_AMOUNT_THRESHOLD
                        details = (
                            f"{below_amount_count} transfers were below threshold {min_amount}"
                        )
                    elif outside_time_count > 0 and len(qualifying_candidates) == 0:
                        reason = TerminalReason.OUTSIDE_TIME_WINDOW
                        details = f"{outside_time_count} transfers were outside requested window"

                discovered_paths.append(
                    TracePath(
                        path_id=f"path_{len(discovered_paths) + 1}_{uuid.uuid4().hex[:6]}",
                        hops=path_hops,
                        total_amount=str(
                            sum((_parse_amount(h.amount) for h in path_hops), Decimal(0))
                        ),
                        terminal_wallet=curr_address,
                        terminal_reason=reason,
                    )
                )
                terminals.append(
                    TerminalNodeInfo(
                        wallet=curr_address, reason=reason, hop_level=hop_level, details=details
                    )
                )
                continue

            # Process candidates
            for edge in qualifying_candidates:
                props = edge.get("properties", {})
                if direction == TraceDirection.BACKWARD:
                    next_wallet_id = edge["source"]
                else:
                    next_wallet_id = edge["target"]

                next_address = (
                    next_wallet_id.split(":", 1)[1] if ":" in next_wallet_id else next_wallet_id
                )

                # Cycle detection: per-path check
                if next_wallet_id in path_visited:
                    cycle_hop = TraceHop(
                        hop_number=hop_level + 1,
                        from_wallet=curr_address,
                        to_wallet=next_address,
                        tx_hash=props.get("tx_hash", ""),
                        chain=BlockchainType(chain),
                        asset=props.get("asset", "USDT"),
                        token_contract=props.get("token_contract"),
                        amount=str(props.get("amount", "0")),
                        fee=str(props.get("fee", "0.0")),
                        timestamp=props.get("timestamp", ""),
                    )
                    cycle_hops = path_hops + [cycle_hop]
                    discovered_paths.append(
                        TracePath(
                            path_id=f"path_{len(discovered_paths) + 1}_{uuid.uuid4().hex[:6]}",
                            hops=cycle_hops,
                            total_amount=str(
                                sum((_parse_amount(h.amount) for h in cycle_hops), Decimal(0))
                            ),
                            terminal_wallet=next_address,
                            terminal_reason=TerminalReason.CYCLE_DETECTED,
                        )
                    )
                    terminals.append(
                        TerminalNodeInfo(
                            wallet=next_address,
                            reason=TerminalReason.CYCLE_DETECTED,
                            hop_level=hop_level + 1,
                            details="Cycle returned to an already visited wallet in this branch",
                        )
                    )
                    continue

                # Add to discovered graph elements
                discovered_edges[edge["id"]] = edge
                if next_wallet_id in raw_nodes:
                    discovered_nodes[next_wallet_id] = raw_nodes[next_wallet_id]
                else:
                    discovered_nodes[next_wallet_id] = {
                        "id": next_wallet_id,
                        "type": "wallet",
                        "label": next_address[:8] + "..."
                        if len(next_address) > 12
                        else next_address,
                        "chain": chain,
                        "properties": {"address": next_address, "chain": chain},
                    }

                hop = TraceHop(
                    hop_number=hop_level + 1,
                    from_wallet=curr_address,
                    to_wallet=next_address,
                    tx_hash=props.get("tx_hash", ""),
                    chain=BlockchainType(chain),
                    asset=props.get("asset", "USDT"),
                    token_contract=props.get("token_contract"),
                    amount=str(props.get("amount", "0")),
                    fee=str(props.get("fee", "0.0")),
                    timestamp=props.get("timestamp", ""),
                )

                new_visited = set(path_visited)
                new_visited.add(next_wallet_id)
                queue.append((next_wallet_id, hop_level + 1, path_hops + [hop], new_visited))

        # Rank paths: highest total amount, then shortest hop length
        discovered_paths.sort(
            key=lambda p: (_parse_amount(p.total_amount), -len(p.hops)), reverse=True
        )

        max_hop_reached = max([len(p.hops) for p in discovered_paths], default=0)
        status = JobStatus.PARTIAL if safety_limit_reached else JobStatus.COMPLETED

        return TraceResult(
            seed={"chain": chain, "address": seed},
            configuration=TraceRequest(
                chain=BlockchainType(chain), seed_wallet=seed, max_hops=max_hops
            ),
            nodes=list(discovered_nodes.values()),
            edges=list(discovered_edges.values()),
            paths=discovered_paths[:max_paths_limit],
            terminals=terminals,
            statistics=TraceStatistics(
                nodes=len(discovered_nodes),
                edges=len(discovered_edges),
                paths=len(discovered_paths),
                max_hop_reached=max_hop_reached,
            ),
            status=status,
            message="Trace completed partially because safety limit was reached."
            if safety_limit_reached
            else None,
        )

    async def _traverse_neo4j(
        self,
        driver: Any,
        chain: str,
        seed: str,
        max_hops: int,
        min_amount: Decimal | None,
        asset: str | None,
        token_contract: str | None,
        start_time: str | None,
        end_time: str | None,
        direction: TraceDirection,
        max_nodes_limit: int,
        max_edges_limit: int,
        max_paths_limit: int,
        timeout_sec: int,
    ) -> TraceResult:
        """
        Neo4j Cypher parameterized iterative traversal.
        Uses explicit hop-by-hop queries to prevent unbounded variable-length expansions.
        """
        start_mono = time.monotonic()
        seed_id = make_wallet_id(chain, seed)
        discovered_nodes: dict[str, dict[str, Any]] = {}
        discovered_edges: dict[str, dict[str, Any]] = {}
        discovered_paths: list[TracePath] = []
        terminals: list[TerminalNodeInfo] = []

        discovered_nodes[seed_id] = {
            "id": seed_id,
            "type": "wallet",
            "label": seed[:8] + "...",
            "chain": chain,
            "properties": {"address": seed, "chain": chain},
        }

        # Iterative hop-by-hop BFS queue: (curr_wallet_id, hop_level, path_hops, visited_set)
        queue: list[tuple[str, int, list[TraceHop], set[str]]] = [(seed_id, 0, [], {seed_id})]
        safety_limit_reached = False

        # Build parameterized Cypher query for single-step expansion
        # Avoid unbounded MATCH (a)-[*]->(b)
        cypher_step = """
        MATCH (w:Wallet {id: $wallet_id})-[r:TRANSFER]->(target:Wallet)
        WHERE r.chain = $chain
          AND ($asset IS NULL OR r.asset = $asset)
          AND ($min_amount IS NULL OR toFloat(r.amount) >= $min_amount)
          AND ($start_time IS NULL OR r.timestamp >= $start_time)
          AND ($end_time IS NULL OR r.timestamp <= $end_time)
        RETURN target.id AS target_id, target.address AS target_address, target.chain AS target_chain,
               r.id AS edge_id, r.tx_hash AS tx_hash, r.amount AS amount, r.asset AS asset,
               r.fee AS fee, r.timestamp AS timestamp, r.token_contract AS token_contract
        LIMIT 100
        """

        async with driver.session(database=settings.NEO4J_DATABASE) as session:
            while queue:
                if (
                    len(discovered_paths) >= max_paths_limit
                    or len(discovered_nodes) >= max_nodes_limit
                    or len(discovered_edges) >= max_edges_limit
                ):
                    safety_limit_reached = True
                    break

                curr_wallet_id, hop_level, path_hops, path_visited = queue.pop(0)
                curr_address = (
                    curr_wallet_id.split(":", 1)[1] if ":" in curr_wallet_id else curr_wallet_id
                )

                if hop_level >= max_hops:
                    discovered_paths.append(
                        TracePath(
                            path_id=f"path_{len(discovered_paths) + 1}_{uuid.uuid4().hex[:6]}",
                            hops=path_hops,
                            total_amount=str(
                                sum((_parse_amount(h.amount) for h in path_hops), Decimal(0))
                            ),
                            terminal_wallet=curr_address,
                            terminal_reason=TerminalReason.MAX_HOPS_REACHED,
                        )
                    )
                    terminals.append(
                        TerminalNodeInfo(
                            wallet=curr_address,
                            reason=TerminalReason.MAX_HOPS_REACHED,
                            hop_level=hop_level,
                        )
                    )
                    continue

                params = {
                    "wallet_id": curr_wallet_id,
                    "chain": chain,
                    "asset": asset.strip().upper() if asset else None,
                    "min_amount": float(min_amount) if min_amount else None,
                    "start_time": start_time,
                    "end_time": end_time,
                }

                res = await session.run(cypher_step, params)
                records = await res.data()

                if not records:
                    discovered_paths.append(
                        TracePath(
                            path_id=f"path_{len(discovered_paths) + 1}_{uuid.uuid4().hex[:6]}",
                            hops=path_hops,
                            total_amount=str(
                                sum((_parse_amount(h.amount) for h in path_hops), Decimal(0))
                            ),
                            terminal_wallet=curr_address,
                            terminal_reason=TerminalReason.NO_OUTGOING_TRANSFERS,
                        )
                    )
                    terminals.append(
                        TerminalNodeInfo(
                            wallet=curr_address,
                            reason=TerminalReason.NO_OUTGOING_TRANSFERS,
                            hop_level=hop_level,
                        )
                    )
                    continue

                for rec in records:
                    next_wallet_id = rec["target_id"]
                    next_address = rec["target_address"]

                    if next_wallet_id in path_visited:
                        cycle_hop = TraceHop(
                            hop_number=hop_level + 1,
                            from_wallet=curr_address,
                            to_wallet=next_address,
                            tx_hash=rec.get("tx_hash", ""),
                            chain=BlockchainType(chain),
                            asset=rec.get("asset", "USDT"),
                            token_contract=rec.get("token_contract"),
                            amount=str(rec.get("amount", "0")),
                            fee=str(rec.get("fee", "0.0")),
                            timestamp=rec.get("timestamp", ""),
                        )
                        cycle_hops = path_hops + [cycle_hop]
                        discovered_paths.append(
                            TracePath(
                                path_id=f"path_{len(discovered_paths) + 1}_{uuid.uuid4().hex[:6]}",
                                hops=cycle_hops,
                                total_amount=str(
                                    sum((_parse_amount(h.amount) for h in cycle_hops), Decimal(0))
                                ),
                                terminal_wallet=next_address,
                                terminal_reason=TerminalReason.CYCLE_DETECTED,
                            )
                        )
                        terminals.append(
                            TerminalNodeInfo(
                                wallet=next_address,
                                reason=TerminalReason.CYCLE_DETECTED,
                                hop_level=hop_level + 1,
                            )
                        )
                        continue

                    discovered_nodes[next_wallet_id] = {
                        "id": next_wallet_id,
                        "type": "wallet",
                        "label": next_address[:8] + "...",
                        "chain": chain,
                        "properties": {"address": next_address, "chain": chain},
                    }
                    discovered_edges[rec["edge_id"]] = {
                        "id": rec["edge_id"],
                        "source": curr_wallet_id,
                        "target": next_wallet_id,
                        "type": "transfer",
                        "properties": {
                            "tx_hash": rec.get("tx_hash"),
                            "amount": rec.get("amount"),
                            "asset": rec.get("asset"),
                            "timestamp": rec.get("timestamp"),
                        },
                    }

                    hop = TraceHop(
                        hop_number=hop_level + 1,
                        from_wallet=curr_address,
                        to_wallet=next_address,
                        tx_hash=rec.get("tx_hash", ""),
                        chain=BlockchainType(chain),
                        asset=rec.get("asset", "USDT"),
                        token_contract=rec.get("token_contract"),
                        amount=str(rec.get("amount", "0")),
                        fee=str(rec.get("fee", "0.0")),
                        timestamp=rec.get("timestamp", ""),
                    )

                    new_visited = set(path_visited)
                    new_visited.add(next_wallet_id)
                    queue.append((next_wallet_id, hop_level + 1, path_hops + [hop], new_visited))

        discovered_paths.sort(
            key=lambda p: (_parse_amount(p.total_amount), -len(p.hops)), reverse=True
        )
        max_hop_reached = max([len(p.hops) for p in discovered_paths], default=0)
        elapsed = (time.monotonic() - start_mono) * 1000.0

        return TraceResult(
            seed={"chain": chain, "address": seed},
            configuration=TraceRequest(
                chain=BlockchainType(chain), seed_wallet=seed, max_hops=max_hops
            ),
            nodes=list(discovered_nodes.values()),
            edges=list(discovered_edges.values()),
            paths=discovered_paths[:max_paths_limit],
            terminals=terminals,
            statistics=TraceStatistics(
                nodes=len(discovered_nodes),
                edges=len(discovered_edges),
                paths=len(discovered_paths),
                max_hop_reached=max_hop_reached,
                duration_ms=round(elapsed, 2),
            ),
            status=JobStatus.PARTIAL if safety_limit_reached else JobStatus.COMPLETED,
            message="Trace completed partially because safety limit was reached."
            if safety_limit_reached
            else None,
        )


# Singleton
_trace_engine_instance: TraceEngine | None = None


def get_trace_engine() -> TraceEngine:
    global _trace_engine_instance
    if _trace_engine_instance is None:
        _trace_engine_instance = TraceEngine()
    return _trace_engine_instance
