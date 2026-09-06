"""
Graph Intelligence Service
Orchestrates graph ingestion, idempotent upserts, multi-chain separation,
parameterized Cypher queries, and graph retrieval with defensive limits.
Source of truth: Master Prompt Sections 1, 9-18 & docs/architecture.md Section 4.6
"""
import logging
import time
from datetime import UTC, datetime

from apps.api.src.adapters.models import NormalizedTransaction
from apps.api.src.core.config import settings
from apps.api.src.core.in_memory_graph import (
    InMemoryGraphStore,
    get_in_memory_graph_store,
    make_tx_id,
    make_wallet_id,
)
from apps.api.src.core.neo4j import get_neo4j_driver
from apps.api.src.models.graph import (
    GraphEdge,
    GraphNode,
    GraphResponse,
    GraphSummary,
    IngestionResult,
)
from chaintrace_shared import BlockchainType

logger = logging.getLogger(__name__)


class GraphService:
    """
    Unified Graph Service managing Neo4j execution with seamless in-memory fallback.
    Guarantees strict idempotency, multi-chain identity isolation, and parameterized Cypher.
    """

    def __init__(self, in_memory_store: InMemoryGraphStore | None = None):
        self._in_memory = in_memory_store or get_in_memory_graph_store()

    async def ingest_transactions(
        self,
        transactions: list[NormalizedTransaction],
        case_id: str | None = None,
    ) -> IngestionResult:
        """
        Idempotently ingests normalized transactions into the graph database.
        Deduplicates incoming records and merges wallets, transactions, and transfer edges.
        """
        start_time = time.monotonic()
        if not transactions:
            return IngestionResult(
                status="COMPLETED",
                transactions_processed=0,
                duration_ms=0.0,
                case_id=case_id,
            )

        # 1. Deduplicate in-memory by composite key: (chain, tx_hash, from, to, asset)
        seen_keys: set[str] = set()
        deduped_txs: list[NormalizedTransaction] = []
        for tx in transactions:
            key = f"{tx.chain.value}:{tx.tx_hash}:{tx.from_address}:{tx.to_address}:{tx.asset}"
            if key not in seen_keys:
                seen_keys.add(key)
                deduped_txs.append(tx)

        wallets_created = 0
        txs_created = 0
        edges_created = 0

        driver = get_neo4j_driver()
        use_neo4j = False

        if driver is not None:
            try:
                # Test connectivity quickly
                await driver.verify_connectivity()
                use_neo4j = True
            except Exception as exc:
                logger.debug("Neo4j driver unreachable (%s). Using in-memory graph store.", exc)
                use_neo4j = False

        if use_neo4j and driver is not None:
            # 2a. Execute parameterized Cypher queries in Neo4j
            cypher_upsert = """
            MERGE (src:Wallet {id: $src_id})
            ON CREATE SET 
                src.address = $src_addr,
                src.chain = $chain,
                src.first_seen = $ts,
                src.last_seen = $ts,
                src.transaction_count = 1,
                src.is_demo = $is_demo
            ON MATCH SET 
                src.last_seen = CASE WHEN $ts > src.last_seen THEN $ts ELSE src.last_seen END,
                src.transaction_count = src.transaction_count + 1

            MERGE (dst:Wallet {id: $dst_id})
            ON CREATE SET 
                dst.address = $dst_addr,
                dst.chain = $chain,
                dst.first_seen = $ts,
                dst.last_seen = $ts,
                dst.transaction_count = 1,
                dst.is_demo = $is_demo
            ON MATCH SET 
                dst.last_seen = CASE WHEN $ts > dst.last_seen THEN $ts ELSE dst.last_seen END,
                dst.transaction_count = dst.transaction_count + 1

            MERGE (t:Transaction {id: $tx_id})
            ON CREATE SET 
                t.tx_hash = $tx_hash,
                t.chain = $chain,
                t.timestamp = $ts,
                t.block_number = $block_number,
                t.asset = $asset,
                t.amount = $amount,
                t.fee = $fee,
                t.provider = $provider,
                t.is_demo = $is_demo

            MERGE (src)-[:SENT]->(t)
            MERGE (t)-[:TO]->(dst)
            MERGE (src)-[r:TRANSFER {id: $tx_id}]->(dst)
            ON CREATE SET 
                r.tx_hash = $tx_hash,
                r.chain = $chain,
                r.timestamp = $ts,
                r.asset = $asset,
                r.amount = $amount,
                r.fee = $fee,
                r.is_demo = $is_demo
            """
            try:
                async with driver.session(database=settings.NEO4J_DATABASE) as session:
                    for tx in deduped_txs:
                        src_id = make_wallet_id(tx.chain.value, tx.from_address)
                        dst_id = make_wallet_id(tx.chain.value, tx.to_address)
                        tx_id = make_tx_id(
                            chain=tx.chain.value,
                            tx_hash=tx.tx_hash,
                            from_addr=tx.from_address,
                            to_addr=tx.to_address,
                            asset=tx.asset,
                        )

                        params = {
                            "src_id": src_id,
                            "dst_id": dst_id,
                            "src_addr": tx.from_address,
                            "dst_addr": tx.to_address,
                            "tx_id": tx_id,
                            "tx_hash": tx.tx_hash,
                            "chain": tx.chain.value,
                            "ts": tx.timestamp,
                            "block_number": tx.block_number,
                            "asset": tx.asset,
                            "amount": tx.amount,
                            "fee": tx.fee,
                            "provider": tx.provider,
                            "is_demo": tx.is_demo,
                        }
                        result = await session.run(cypher_upsert, params)
                        summary = await result.consume()
                        counters = summary.counters
                        wallets_created += counters.nodes_created
                        edges_created += counters.relationships_created
            except Exception as exc:
                logger.error("Neo4j ingestion transaction failed: %s. Falling back to in-memory store.", exc)
                use_neo4j = False

        if not use_neo4j:
            # 2b. Execute resilient in-memory property graph store
            for tx in deduped_txs:
                src_id, src_created = await self._in_memory.upsert_wallet(
                    chain=tx.chain.value,
                    address=tx.from_address,
                    timestamp=tx.timestamp,
                    is_demo=tx.is_demo,
                )
                dst_id, dst_created = await self._in_memory.upsert_wallet(
                    chain=tx.chain.value,
                    address=tx.to_address,
                    timestamp=tx.timestamp,
                    is_demo=tx.is_demo,
                )
                tx_id, tx_created = await self._in_memory.upsert_transaction(tx)
                dir_created, _struct_created = await self._in_memory.link_transfer(
                    src_wallet_id=src_id,
                    dst_wallet_id=dst_id,
                    tx_node_id=tx_id,
                    tx=tx,
                )

                if src_created:
                    wallets_created += 1
                if dst_created:
                    wallets_created += 1
                if tx_created:
                    txs_created += 1
                if dir_created:
                    edges_created += 1

        elapsed_ms = (time.monotonic() - start_time) * 1000.0

        # Structured Observability Logging (Master Prompt Section 22)
        logger.info(
            "Graph ingestion complete: processed=%d wallets_new=%d txs_new=%d edges_new=%d elapsed=%.2fms case_id=%s",
            len(deduped_txs),
            wallets_created,
            txs_created,
            edges_created,
            elapsed_ms,
            case_id,
        )

        return IngestionResult(
            status="COMPLETED",
            transactions_processed=len(deduped_txs),
            wallets_created=wallets_created,
            transactions_created=txs_created,
            edges_created=edges_created,
            duration_ms=round(elapsed_ms, 2),
            case_id=case_id,
            chain=deduped_txs[0].chain.value if deduped_txs else None,
        )

    async def get_wallet_graph(
        self,
        chain: str,
        address: str,
        max_hops: int = 1,
        limit: int = 50,
    ) -> GraphResponse:
        """Retrieves graph neighborhood centered at a wallet with bounded defensive limits."""
        bounded_limit = max(1, min(limit, settings.MAX_NODES_PER_JOB))
        center_id = make_wallet_id(chain, address)

        driver = get_neo4j_driver()
        if driver is not None:
            try:
                cypher_query = """
                MATCH (w:Wallet {id: $center_id})
                OPTIONAL MATCH (w)-[r:TRANSFER]-(other:Wallet)
                RETURN w, r, other
                LIMIT $limit
                """
                async with driver.session(database=settings.NEO4J_DATABASE) as session:
                    result = await session.run(cypher_query, {"center_id": center_id, "limit": bounded_limit})
                    records = await result.data()
                    if records:
                        nodes_map: dict[str, GraphNode] = {}
                        edges_list: list[GraphEdge] = []

                        for rec in records:
                            w = rec.get("w")
                            if w:
                                nodes_map[w["id"]] = GraphNode(
                                    id=w["id"],
                                    type="wallet",
                                    label=w["address"][:8] + "...",
                                    chain=w["chain"],
                                    properties=dict(w),
                                )
                            other = rec.get("other")
                            if other:
                                nodes_map[other["id"]] = GraphNode(
                                    id=other["id"],
                                    type="wallet",
                                    label=other["address"][:8] + "...",
                                    chain=other["chain"],
                                    properties=dict(other),
                                )
                            r = rec.get("r")
                            if r and w and other:
                                edges_list.append(
                                    GraphEdge(
                                        id=r.get("id", f"edge_{len(edges_list)}"),
                                        source=w["id"],
                                        target=other["id"],
                                        type="transfer",
                                        properties=dict(r),
                                    )
                                )

                        return GraphResponse(
                            nodes=list(nodes_map.values()),
                            edges=edges_list,
                            summary=GraphSummary(
                                node_count=len(nodes_map),
                                edge_count=len(edges_list),
                                chains=list({n.chain for n in nodes_map.values()}),
                            ),
                        )
            except Exception as exc:
                logger.debug("Neo4j query failed (%s). Falling back to in-memory store.", exc)

        return await self._in_memory.get_wallet_neighborhood(chain, address, max_hops=max_hops, limit=bounded_limit)

    async def get_transaction_graph(self, chain: str, tx_hash: str) -> GraphResponse:
        """Retrieves transaction node with connected source and destination wallets."""
        clean_chain = chain.lower().strip()
        clean_hash = tx_hash.strip().lower()

        driver = get_neo4j_driver()
        if driver is not None:
            try:
                cypher_query = """
                MATCH (t:Transaction {chain: $chain, tx_hash: $tx_hash})
                OPTIONAL MATCH (src:Wallet)-[:SENT]->(t)
                OPTIONAL MATCH (t)-[:TO]->(dst:Wallet)
                RETURN t, src, dst
                LIMIT 10
                """
                async with driver.session(database=settings.NEO4J_DATABASE) as session:
                    res = await session.run(cypher_query, {"chain": clean_chain, "tx_hash": clean_hash})
                    records = await res.data()
                    if records:
                        nodes_map: dict[str, GraphNode] = {}
                        edges_list: list[GraphEdge] = []

                        for rec in records:
                            t = rec.get("t")
                            src = rec.get("src")
                            dst = rec.get("dst")

                            if t:
                                nodes_map[t["id"]] = GraphNode(
                                    id=t["id"],
                                    type="transaction",
                                    label=f"{t.get('asset', '')} {t.get('amount', '')}",
                                    chain=t["chain"],
                                    properties=dict(t),
                                )
                            if src:
                                nodes_map[src["id"]] = GraphNode(
                                    id=src["id"],
                                    type="wallet",
                                    label=src["address"][:8] + "...",
                                    chain=src["chain"],
                                    properties=dict(src),
                                )
                                if t:
                                    edges_list.append(
                                        GraphEdge(
                                            id=f"sent:{src['id']}->{t['id']}",
                                            source=src["id"],
                                            target=t["id"],
                                            type="sent",
                                        )
                                    )
                            if dst:
                                nodes_map[dst["id"]] = GraphNode(
                                    id=dst["id"],
                                    type="wallet",
                                    label=dst["address"][:8] + "...",
                                    chain=dst["chain"],
                                    properties=dict(dst),
                                )
                                if t:
                                    edges_list.append(
                                        GraphEdge(
                                            id=f"to:{t['id']}->{dst['id']}",
                                            source=t["id"],
                                            target=dst["id"],
                                            type="to",
                                        )
                                    )

                        return GraphResponse(
                            nodes=list(nodes_map.values()),
                            edges=edges_list,
                            summary=GraphSummary(
                                node_count=len(nodes_map),
                                edge_count=len(edges_list),
                                chains=[clean_chain],
                            ),
                        )
            except Exception as exc:
                logger.debug("Neo4j tx query failed: %s. Using in-memory store.", exc)

        return await self._in_memory.get_transaction_subgraph(chain, tx_hash)

    async def load_demo_fraud_network(
        self,
        chain: str = "tron",
        case_id: str | None = None,
    ) -> IngestionResult:
        """
        Creates a deterministic 5-hop fraud trail (Master Prompt Section 19):
        Victim Wallet -> Suspect Mule Wallet -> Layering Intermediate -> Consolidation -> Known VASP Deposit
        Explicitly marked with is_demo=True and [DEMO DATA] tags.
        """
        now = datetime.now(UTC).isoformat()
        chain_enum = BlockchainType(chain.lower())

        demo_transactions = [
            NormalizedTransaction(
                chain=chain_enum,
                tx_hash="demo_tx_hop1_victim_to_suspect_001",
                block_number=54120001,
                timestamp=now,
                from_address="TA4Wt1DUCqz6YegbnsmqsWC5uUfbdBqPxm",  # Victim
                to_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",    # Suspect Primary Mule
                asset="USDT",
                token_contract="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                amount="100000.00",
                fee="2.5",
                direction="OUTGOING",
                provider="demo_fraud_generator",
                is_demo=True,
                raw_reference={"note": "[DEMO DATA] Victim initial investment transfer"},
            ),
            NormalizedTransaction(
                chain=chain_enum,
                tx_hash="demo_tx_hop2_suspect_to_layer1_002",
                block_number=54120025,
                timestamp=now,
                from_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",    # Suspect Primary Mule
                to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9E",    # Layer 1 Mule
                asset="USDT",
                token_contract="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                amount="48000.00",
                fee="2.5",
                direction="OUTGOING",
                provider="demo_fraud_generator",
                is_demo=True,
                raw_reference={"note": "[DEMO DATA] Layering split hop A"},
            ),
            NormalizedTransaction(
                chain=chain_enum,
                tx_hash="demo_tx_hop3_suspect_to_layer2_003",
                block_number=54120030,
                timestamp=now,
                from_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",    # Suspect Primary Mule
                to_address="TLyqzVGLV1srkB7dToTAwdg29TFVKbh58A",    # Layer 1 Mule B
                asset="USDT",
                token_contract="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                amount="51000.00",
                fee="2.5",
                direction="OUTGOING",
                provider="demo_fraud_generator",
                is_demo=True,
                raw_reference={"note": "[DEMO DATA] Layering split hop B"},
            ),
            NormalizedTransaction(
                chain=chain_enum,
                tx_hash="demo_tx_hop4_layer_to_consolidator_004",
                block_number=54120090,
                timestamp=now,
                from_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9E",    # Layer 1 Mule A
                to_address="TConsolidationWallet999999999999999",  # Consolidation
                asset="USDT",
                token_contract="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                amount="47500.00",
                fee="3.0",
                direction="OUTGOING",
                provider="demo_fraud_generator",
                is_demo=True,
                raw_reference={"note": "[DEMO DATA] Consolidation transfer"},
            ),
            NormalizedTransaction(
                chain=chain_enum,
                tx_hash="demo_tx_hop5_consolidator_to_vasp_005",
                block_number=54120150,
                timestamp=now,
                from_address="TConsolidationWallet999999999999999",  # Consolidation
                to_address="TVaspBinanceDepositHotWallet88888888", # VASP Exchange Deposit
                asset="USDT",
                token_contract="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                amount="95000.00",
                fee="4.5",
                direction="OUTGOING",
                provider="demo_fraud_generator",
                is_demo=True,
                raw_reference={"note": "[DEMO DATA] Liquidation deposit into exchange"},
            ),
        ]

        return await self.ingest_transactions(demo_transactions, case_id=case_id)


# Global Service Singleton
_graph_service_instance: GraphService | None = None


def get_graph_service() -> GraphService:
    global _graph_service_instance
    if _graph_service_instance is None:
        _graph_service_instance = GraphService()
    return _graph_service_instance
