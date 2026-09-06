"""
Blockchain Adapter Typed Exceptions
Controlled application-level error hierarchy mapping provider failures
without leaking provider secrets, internal URLs, or raw stack traces.
Source of truth: docs/architecture.md & Master Prompt Section 7
"""


class BlockchainError(Exception):
    """Base exception for all blockchain adapter operations."""
    def __init__(self, message: str, error_code: str = "BLOCKCHAIN_ERROR", status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code

    def to_dict(self) -> dict[str, str]:
        return {
            "error_code": self.error_code,
            "message": self.message,
        }


class InvalidWalletAddressError(BlockchainError):
    """Raised when a wallet address fails chain-specific validation."""
    def __init__(self, message: str = "Invalid blockchain wallet address format"):
        super().__init__(message, error_code="INVALID_WALLET_ADDRESS", status_code=400)


class TransactionNotFoundError(BlockchainError):
    """Raised when a transaction hash is not found on the specified blockchain."""
    def __init__(self, message: str = "Transaction not found"):
        super().__init__(message, error_code="TRANSACTION_NOT_FOUND", status_code=404)


class ProviderUnavailableError(BlockchainError):
    """Raised when external blockchain RPC/API is unreachable or returning 5xx errors."""
    def __init__(self, message: str = "Blockchain data provider is temporarily unavailable"):
        super().__init__(message, error_code="BLOCKCHAIN_PROVIDER_UNAVAILABLE", status_code=503)


class RateLimitedError(BlockchainError):
    """Raised when provider rate limits (HTTP 429) are encountered."""
    def __init__(self, message: str = "Blockchain provider rate limit exceeded. Please retry later"):
        super().__init__(message, error_code="RATE_LIMITED", status_code=429)


class ProviderTimeoutError(BlockchainError):
    """Raised when a request to a blockchain provider times out."""
    def __init__(self, message: str = "Blockchain provider request timed out"):
        super().__init__(message, error_code="PROVIDER_TIMEOUT", status_code=504)


class MalformedResponseError(BlockchainError):
    """Raised when provider returns an unparseable or corrupted payload."""
    def __init__(self, message: str = "Received malformed response from blockchain provider"):
        super().__init__(message, error_code="MALFORMED_RESPONSE", status_code=502)
