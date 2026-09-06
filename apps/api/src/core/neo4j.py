"""
Neo4j Graph Database Driver & Schema Initialization
Manages connection lifecycle, Cypher schema constraints, and health verification.
Source of truth: Master Prompt Section 3, 5, 21
"""

import logging

from apps.api.src.core.config import settings
from neo4j import AsyncDriver, AsyncGraphDatabase

logger = logging.getLogger(__name__)

_driver: AsyncDriver | None = None


def get_neo4j_driver() -> AsyncDriver | None:
    global _driver
    if _driver is None and settings.NEO4J_URI:
        try:
            _driver = AsyncGraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
            )
        except Exception as exc:
            logger.debug("Failed to initialize Neo4j driver: %s", exc)
            _driver = None
    return _driver


async def init_neo4j_schema(driver: AsyncDriver | None = None) -> bool:
    """
    Idempotently creates uniqueness constraints and performance indexes in Neo4j.
    Guarantees multi-chain separation and fast traversal queries for future phases.
    """
    active_driver = driver or get_neo4j_driver()
    if active_driver is None:
        return False

    constraint_queries = [
        # Wallet uniqueness constraint on composite id: {chain}:{address}
        """
        CREATE CONSTRAINT wallet_composite_id_unique IF NOT EXISTS
        FOR (w:Wallet) REQUIRE w.id IS UNIQUE
        """,
        # Transaction uniqueness constraint on composite id: {chain}:{tx_hash}:{from}:{to}:{asset}
        """
        CREATE CONSTRAINT transaction_composite_id_unique IF NOT EXISTS
        FOR (t:Transaction) REQUIRE t.id IS UNIQUE
        """,
        # Index on wallet address and chain for fast lookup
        """
        CREATE INDEX wallet_address_lookup_idx IF NOT EXISTS
        FOR (w:Wallet) ON (w.address)
        """,
        """
        CREATE INDEX wallet_chain_lookup_idx IF NOT EXISTS
        FOR (w:Wallet) ON (w.chain)
        """,
        # Index on transaction hash
        """
        CREATE INDEX tx_hash_lookup_idx IF NOT EXISTS
        FOR (t:Transaction) ON (t.tx_hash)
        """,
        # Index on transaction timestamp
        """
        CREATE INDEX tx_timestamp_lookup_idx IF NOT EXISTS
        FOR (t:Transaction) ON (t.timestamp)
        """,
    ]

    try:
        async with active_driver.session(database=settings.NEO4J_DATABASE) as session:
            for query in constraint_queries:
                await session.run(query)
        logger.info("Neo4j constraints and indexes verified successfully.")
        return True
    except Exception as exc:
        logger.warning("Could not execute Neo4j schema constraint queries: %s", exc)
        return False


async def check_neo4j_health() -> dict:
    """Verifies connectivity to Neo4j graph instance."""
    driver = get_neo4j_driver()
    if driver is None:
        if settings.NEO4J_MOCK_FALLBACK:
            return {"status": "mock_mode", "info": "Local in-memory graph fallback active"}
        return {"status": "disconnected", "error": "Driver uninitialized"}

    try:
        await driver.verify_connectivity()
        return {"status": "connected", "uri": settings.NEO4J_URI}
    except Exception as exc:
        if settings.NEO4J_MOCK_FALLBACK:
            return {
                "status": "mock_mode",
                "info": "Neo4j unavailable; mock/in-memory graph fallback active",
                "details": str(exc),
            }
        return {"status": "disconnected", "error": str(exc)}


async def close_neo4j_driver():
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None
