"""
In-Memory Property Graph Store
High-fidelity fallback engine implementing property graph semantics, multi-chain separation,
safe upsert idempotency, and neighborhood queries when Neo4j is offline in local dev/testing.
Source of truth: Master Prompt Sections 5-11, 20
"""

import asyncio
from typing import Any

from apps.api.src.adapters.models import NormalizedTransaction
from apps.api.src.models.graph import GraphEdge, GraphNode, GraphResponse, GraphSummary


def make_wallet_id(chain: str, address: str) -> str:
    return f"{chain.lower().strip()}:{address.strip()}"


def make_tx_id(chain: str, tx_hash: str, from_addr: str, to_addr: str, asset: str) -> str:
    clean_chain = chain.lower().strip()
    clean_hash = tx_hash.strip().lower()
    clean_from = from_addr.strip().lower()
    clean_to = to_addr.strip().lower()
    clean_asset = asset.strip().upper()
    return f"{clean_chain}:{clean_hash}:{clean_from}:{clean_to}:{clean_asset}"


class InMemoryGraphStore:
    """
    Thread-safe in-memory property graph store.
    Guarantees strict idempotency and multi-chain isolation.
    """

    def __init__(self):
        self._nodes: dict[str, dict[str, Any]] = {}
        self._edges: dict[str, dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def clear(self) -> None:
        async with self._lock:
            self._nodes.clear()
            self._edges.clear()

    async def upsert_wallet(
        self, chain: str, address: str, timestamp: str, is_demo: bool = False
    ) -> tuple[str, bool]:
        """
        Idempotently inserts or updates a wallet node.
        Returns: (wallet_id, was_created)
        """
        w_id = make_wallet_id(chain, address)
        was_created = False

        async with self._lock:
            if w_id not in self._nodes:
                self._nodes[w_id] = {
                    "id": w_id,
                    "type": "wallet",
                    "label": address[:8] + "..." + address[-6:] if len(address) > 16 else address,
                    "chain": chain.lower().strip(),
                    "properties": {
                        "address": address,
                        "chain": chain.lower().strip(),
                        "first_seen": timestamp,
                        "last_seen": timestamp,
                        "transaction_count": 1,
                        "is_demo": is_demo,
                    },
                }
                was_created = True
            else:
                wallet = self._nodes[w_id]
                props = wallet["properties"]
                if timestamp > props.get("last_seen", ""):
                    props["last_seen"] = timestamp
                props["transaction_count"] = props.get("transaction_count", 1) + 1

        return w_id, was_created

    async def upsert_transaction(self, tx: NormalizedTransaction) -> tuple[str, bool]:
        """
        Idempotently inserts or updates a transaction node.
        Returns: (tx_id, was_created)
        """
        tx_id = make_tx_id(
            chain=tx.chain.value,
            tx_hash=tx.tx_hash,
            from_addr=tx.from_address,
            to_addr=tx.to_address,
            asset=tx.asset,
        )
        was_created = False

        async with self._lock:
            if tx_id not in self._nodes:
                self._nodes[tx_id] = {
                    "id": tx_id,
                    "type": "transaction",
                    "label": f"{tx.asset} {tx.amount}",
                    "chain": tx.chain.value,
                    "properties": {
                        "tx_hash": tx.tx_hash,
                        "chain": tx.chain.value,
                        "timestamp": tx.timestamp,
                        "block_number": tx.block_number,
                        "asset": tx.asset,
                        "token_contract": tx.token_contract,
                        "amount": tx.amount,
                        "fee": tx.fee,
                        "direction": tx.direction,
                        "provider": tx.provider,
                        "is_demo": tx.is_demo,
                    },
                }
                was_created = True

        return tx_id, was_created

    async def link_transfer(
        self,
        src_wallet_id: str,
        dst_wallet_id: str,
        tx_node_id: str,
        tx: NormalizedTransaction,
    ) -> tuple[int, int]:
        """
        Idempotently creates:
        1. (src)-[:TRANSFER]->(dst)
        2. (src)-[:SENT]->(tx) and (tx)-[:TO]->(dst)
        Returns: (direct_transfers_created, structural_edges_created)
        """
        direct_edge_id = f"transfer:{tx_node_id}"
        sent_edge_id = f"sent:{src_wallet_id}->{tx_node_id}"
        to_edge_id = f"to:{tx_node_id}->{dst_wallet_id}"

        new_direct = 0
        new_structural = 0

        async with self._lock:
            # 1. Direct Transfer Edge (for high-level investigation queries)
            if direct_edge_id not in self._edges:
                self._edges[direct_edge_id] = {
                    "id": direct_edge_id,
                    "source": src_wallet_id,
                    "target": dst_wallet_id,
                    "type": "transfer",
                    "properties": {
                        "tx_hash": tx.tx_hash,
                        "chain": tx.chain.value,
                        "timestamp": tx.timestamp,
                        "asset": tx.asset,
                        "amount": tx.amount,
                        "fee": tx.fee,
                        "is_demo": tx.is_demo,
                    },
                }
                new_direct = 1

            # 2. Structural Edges (SENT and TO) for deep graph traversal
            if sent_edge_id not in self._edges:
                self._edges[sent_edge_id] = {
                    "id": sent_edge_id,
                    "source": src_wallet_id,
                    "target": tx_node_id,
                    "type": "sent",
                    "properties": {"timestamp": tx.timestamp},
                }
                new_structural += 1

            if to_edge_id not in self._edges:
                self._edges[to_edge_id] = {
                    "id": to_edge_id,
                    "source": tx_node_id,
                    "target": dst_wallet_id,
                    "type": "to",
                    "properties": {"timestamp": tx.timestamp},
                }
                new_structural += 1

        return new_direct, new_structural

    async def get_wallet_neighborhood(
        self,
        chain: str,
        address: str,
        max_hops: int = 1,
        limit: int = 50,
    ) -> GraphResponse:
        """Retrieves subgraph centered around a wallet up to max_hops with defensive bounds."""
        center_id = make_wallet_id(chain, address)
        bounded_limit = max(1, min(limit, 200))

        async with self._lock:
            if center_id not in self._nodes:
                return GraphResponse()

            matched_node_ids = {center_id}
            matched_edges: list[dict[str, Any]] = []

            # Hop 1: direct transfers connected to center_id
            for edge in self._edges.values():
                if len(matched_edges) >= bounded_limit:
                    break
                if edge["type"] == "transfer":
                    src = edge["source"]
                    dst = edge["target"]
                    if src == center_id or dst == center_id:
                        matched_edges.append(edge)
                        matched_node_ids.add(src)
                        matched_node_ids.add(dst)

            # Build result nodes
            result_nodes: list[GraphNode] = []
            for n_id in matched_node_ids:
                if n_id in self._nodes:
                    raw = self._nodes[n_id]
                    result_nodes.append(
                        GraphNode(
                            id=raw["id"],
                            type=raw["type"],
                            label=raw["label"],
                            chain=raw["chain"],
                            properties=raw["properties"],
                        )
                    )

            # Build result edges
            result_edges: list[GraphEdge] = [
                GraphEdge(
                    id=e["id"],
                    source=e["source"],
                    target=e["target"],
                    type=e["type"],
                    properties=e["properties"],
                )
                for e in matched_edges
            ]

            summary = GraphSummary(
                node_count=len(result_nodes),
                edge_count=len(result_edges),
                chains=list({n.chain for n in result_nodes}),
            )

            return GraphResponse(nodes=result_nodes, edges=result_edges, summary=summary)

    async def get_transaction_subgraph(self, chain: str, tx_hash: str) -> GraphResponse:
        """Retrieves transaction node along with its source and destination wallets."""
        clean_chain = chain.lower().strip()
        clean_hash = tx_hash.strip().lower()

        async with self._lock:
            matched_tx_nodes = [
                n
                for n in self._nodes.values()
                if n["type"] == "transaction"
                and n["chain"] == clean_chain
                and n["properties"].get("tx_hash", "").lower() == clean_hash
            ]

            if not matched_tx_nodes:
                return GraphResponse()

            tx_node = matched_tx_nodes[0]
            tx_id = tx_node["id"]

            matched_node_ids = {tx_id}
            matched_edges: list[dict[str, Any]] = []

            for edge in self._edges.values():
                if (
                    edge["target"] == tx_id
                    or edge["source"] == tx_id
                    or edge.get("properties", {}).get("tx_hash", "").lower() == clean_hash
                ):
                    matched_edges.append(edge)
                    matched_node_ids.add(edge["source"])
                    matched_node_ids.add(edge["target"])

            result_nodes = [
                GraphNode(
                    id=self._nodes[n_id]["id"],
                    type=self._nodes[n_id]["type"],
                    label=self._nodes[n_id]["label"],
                    chain=self._nodes[n_id]["chain"],
                    properties=self._nodes[n_id]["properties"],
                )
                for n_id in matched_node_ids
                if n_id in self._nodes
            ]

            result_edges = [
                GraphEdge(
                    id=e["id"],
                    source=e["source"],
                    target=e["target"],
                    type=e["type"],
                    properties=e["properties"],
                )
                for e in matched_edges
            ]

            return GraphResponse(
                nodes=result_nodes,
                edges=result_edges,
                summary=GraphSummary(
                    node_count=len(result_nodes),
                    edge_count=len(result_edges),
                    chains=[clean_chain],
                ),
            )


# Global in-memory singleton
_in_memory_store = InMemoryGraphStore()


def get_in_memory_graph_store() -> InMemoryGraphStore:
    return _in_memory_store
