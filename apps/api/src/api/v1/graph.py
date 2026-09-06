"""
Graph Query & Ingestion REST API
Exposes property graph endpoints with defensive limits and RBAC authentication.
Source of truth: Master Prompt Sections 12-16 & docs/architecture.md Section 4.6
"""

from apps.api.src.adapters.models import NormalizedTransaction
from apps.api.src.core.database import get_db
from apps.api.src.core.security import get_current_user
from apps.api.src.models.case import Case
from apps.api.src.models.graph import GraphResponse, IngestionResult
from apps.api.src.models.user import User
from apps.api.src.services.graph_service import GraphService, get_graph_service
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/graph", tags=["Graph Intelligence"])


@router.post("/ingest", response_model=IngestionResult)
async def ingest_transactions_endpoint(
    transactions: list[NormalizedTransaction],
    case_id: str | None = Query(default=None, description="Optional associated case ID"),
    service: GraphService = Depends(get_graph_service),
    current_user: User = Depends(get_current_user),
) -> IngestionResult:
    """
    Idempotently ingests normalized transactions into the graph database.
    Deduplicates nodes and relationships automatically.
    """
    if len(transactions) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch limit exceeded. Ingest at most 500 transactions per request.",
        )
    return await service.ingest_transactions(transactions, case_id=case_id)


@router.get("/wallet/{chain}/{address}", response_model=GraphResponse)
async def get_wallet_subgraph(
    chain: str,
    address: str,
    max_hops: int = Query(default=1, ge=1, le=3),
    limit: int = Query(default=50, ge=1, le=200),
    service: GraphService = Depends(get_graph_service),
    current_user: User = Depends(get_current_user),
) -> GraphResponse:
    """Retrieves subgraph neighborhood centered around a wallet address."""
    clean_chain = chain.lower().strip()
    clean_addr = address.strip()
    return await service.get_wallet_graph(clean_chain, clean_addr, max_hops=max_hops, limit=limit)


@router.get("/transaction/{chain}/{tx_hash}", response_model=GraphResponse)
async def get_transaction_subgraph(
    chain: str,
    tx_hash: str,
    service: GraphService = Depends(get_graph_service),
    current_user: User = Depends(get_current_user),
) -> GraphResponse:
    """Retrieves transaction node along with its source and destination wallets."""
    clean_chain = chain.lower().strip()
    clean_hash = tx_hash.strip()
    return await service.get_transaction_graph(clean_chain, clean_hash)


@router.get("/cases/{case_id}", response_model=GraphResponse)
async def get_case_graph(
    case_id: str,
    limit: int = Query(default=100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    service: GraphService = Depends(get_graph_service),
    current_user: User = Depends(get_current_user),
) -> GraphResponse:
    """Retrieves the investigation graph centered on the suspect wallet from the case record."""
    stmt = select(Case).where(Case.id == case_id)
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case '{case_id}' not found")

    if not case.suspect_wallet:
        return GraphResponse()

    # Retrieve graph centered on suspect wallet
    return await service.get_wallet_graph(case.target_chain, case.suspect_wallet, max_hops=2, limit=limit)


@router.post("/demo-network", response_model=IngestionResult)
async def load_demo_fraud_network_endpoint(
    chain: str = Query(default="tron", description="Blockchain for demo fraud scenario"),
    case_id: str | None = Query(default=None),
    service: GraphService = Depends(get_graph_service),
    current_user: User = Depends(get_current_user),
) -> IngestionResult:
    """Loads a deterministic 5-hop fraud scenario (Victim -> Mule -> Consolidation -> VASP)."""
    return await service.load_demo_fraud_network(chain=chain, case_id=case_id)
