"""
Blockchain Adapter REST Endpoints
Safely exposes multi-chain blockchain operations behind the backend adapter layer.
Source of truth: docs/architecture.md Section 4.4
"""
from apps.api.src.adapters.factory import get_blockchain_adapter
from apps.api.src.adapters.models import NormalizedTransaction, WalletBalance
from apps.api.src.core.security import get_current_user
from apps.api.src.models.user import User
from fastapi import APIRouter, Depends, HTTPException, Query, status

router = APIRouter(prefix="/adapters", tags=["Blockchain Adapters"])


@router.get("/validate-address")
async def validate_wallet_address(
    chain: str = Query(..., description="Target chain (tron, ethereum, bitcoin)"),
    address: str = Query(..., description="Wallet address to validate"),
    current_user: User = Depends(get_current_user),
):
    try:
        adapter = get_blockchain_adapter(chain)
        is_valid = adapter.validate_address(address)
        return {"chain": chain, "address": address, "isValid": is_valid}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{chain}/wallets/{address}/balance", response_model=WalletBalance)
async def get_wallet_balance(
    chain: str,
    address: str,
    current_user: User = Depends(get_current_user),
):
    try:
        adapter = get_blockchain_adapter(chain)
        if not adapter.validate_address(address):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid {chain} wallet address: {address}",
            )
        return await adapter.get_balance(address)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{chain}/wallets/{address}/transactions", response_model=list[NormalizedTransaction])
async def get_wallet_transactions(
    chain: str,
    address: str,
    limit: int = Query(default=20, ge=1, le=50),
    cursor: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    try:
        adapter = get_blockchain_adapter(chain)
        if not adapter.validate_address(address):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid {chain} wallet address: {address}",
            )
        txs, _ = await adapter.get_transactions(address=address, cursor=cursor, limit=limit)
        return txs
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{chain}/transactions/{tx_hash}", response_model=NormalizedTransaction)
async def get_transaction_details(
    chain: str,
    tx_hash: str,
    current_user: User = Depends(get_current_user),
):
    try:
        adapter = get_blockchain_adapter(chain)
        tx = await adapter.get_transaction(tx_hash)
        if not tx:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction '{tx_hash}' not found on {chain}",
            )
        return tx
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
