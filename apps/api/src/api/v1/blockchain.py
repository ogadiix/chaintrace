"""
Blockchain Intelligence API Endpoints
Provides normalized multi-chain transaction access to the frontend.
Protected by server-side authentication; strictly shields provider keys and raw errors.
Source of truth: Master Prompt Section 12 & docs/architecture.md Section 4.4
"""
from typing import Any

from apps.api.src.adapters.exceptions import BlockchainError
from apps.api.src.adapters.models import NormalizedTransaction, WalletBalance
from apps.api.src.core.security import get_current_user
from apps.api.src.models.user import User
from apps.api.src.services.blockchain_service import BlockchainService, get_blockchain_service
from fastapi import APIRouter, Depends, HTTPException, Query, status

router = APIRouter(prefix="/blockchain", tags=["Blockchain Intelligence"])


def handle_service_error(exc: Exception) -> None:
    if isinstance(exc, BlockchainError):
        raise HTTPException(
            status_code=exc.status_code,
            detail={"error_code": exc.error_code, "message": exc.message},
        )
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={"error_code": "INTERNAL_ERROR", "message": "An unexpected error occurred"},
    )


@router.get("/{chain}/validate/{address}")
async def validate_wallet_address(
    chain: str,
    address: str,
    service: BlockchainService = Depends(get_blockchain_service),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Validates whether an address has valid format and checksum for the given chain."""
    is_valid = service.validate_address(chain, address)
    return {
        "chain": chain.lower(),
        "address": address,
        "is_valid": is_valid,
    }


@router.get("/{chain}/wallet/{address}/balance", response_model=WalletBalance)
async def get_wallet_balance(
    chain: str,
    address: str,
    service: BlockchainService = Depends(get_blockchain_service),
    current_user: User = Depends(get_current_user),
) -> WalletBalance:
    """Retrieves normalized confirmed native and token balances for an address."""
    try:
        return await service.get_balance(chain, address)
    except Exception as exc:
        handle_service_error(exc)


@router.get("/{chain}/wallet/{address}/transactions")
async def get_wallet_transactions(
    chain: str,
    address: str,
    limit: int = Query(default=25, ge=1, le=100),
    cursor: str | None = Query(default=None),
    service: BlockchainService = Depends(get_blockchain_service),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Retrieves paginated, normalized blockchain transactions for a target wallet address."""
    try:
        transactions, next_cursor = await service.get_transactions(chain, address, limit=limit, cursor=cursor)
        return {
            "chain": chain.lower(),
            "address": address,
            "count": len(transactions),
            "cursor": next_cursor,
            "transactions": transactions,
        }
    except Exception as exc:
        handle_service_error(exc)


@router.get("/{chain}/tx/{tx_hash}", response_model=NormalizedTransaction)
async def get_transaction_details(
    chain: str,
    tx_hash: str,
    service: BlockchainService = Depends(get_blockchain_service),
    current_user: User = Depends(get_current_user),
) -> NormalizedTransaction:
    """Retrieves normalized transaction details by transaction hash."""
    try:
        return await service.get_transaction(chain, tx_hash)
    except Exception as exc:
        handle_service_error(exc)
