"""
Resilience Layer: Retries, Rate Limiting, and Evidentiary Caching
Protects external blockchain providers, mitigates network jitter, and caches immutable data.
Source of truth: Master Prompt Sections 8, 9, 10
"""

import asyncio
import logging
import time
from collections.abc import Callable
from typing import Any, TypeVar

from apps.api.src.adapters.exceptions import (
    BlockchainError,
    InvalidWalletAddressError,
    ProviderTimeoutError,
    ProviderUnavailableError,
    RateLimitedError,
    TransactionNotFoundError,
)

logger = logging.getLogger(__name__)

T = TypeVar("T")


class RetryPolicy:
    """
    Exponential backoff retry policy for transient errors.
    Skips non-retryable errors (invalid addresses, client errors, permanent 4xx).
    """

    NON_RETRYABLE_EXCEPTIONS = (
        InvalidWalletAddressError,
        TransactionNotFoundError,
    )

    def __init__(
        self,
        max_retries: int = 3,
        initial_delay: float = 0.25,
        max_delay: float = 2.0,
        backoff_multiplier: float = 2.0,
    ):
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.backoff_multiplier = backoff_multiplier

    async def execute(
        self, func: Callable[[], Any], operation_name: str = "blockchain_call"
    ) -> Any:
        last_exception = None
        delay = self.initial_delay

        for attempt in range(1, self.max_retries + 1):
            try:
                return await func()
            except self.NON_RETRYABLE_EXCEPTIONS:
                # Permanent error - do not retry
                raise
            except (
                RateLimitedError,
                ProviderUnavailableError,
                ProviderTimeoutError,
                TimeoutError,
            ) as exc:
                last_exception = exc
                if attempt == self.max_retries:
                    logger.warning(
                        "Retry policy exhausted %d attempts for %s: %s",
                        self.max_retries,
                        operation_name,
                        exc,
                    )
                    break

                logger.debug(
                    "Attempt %d/%d for %s failed with transient error: %s. Retrying in %.2fs",
                    attempt,
                    self.max_retries,
                    operation_name,
                    exc,
                    delay,
                )
                await asyncio.sleep(delay)
                delay = min(delay * self.backoff_multiplier, self.max_delay)
            except BlockchainError:
                raise
            except Exception as exc:
                last_exception = exc
                if attempt == self.max_retries:
                    break
                logger.debug(
                    "Unexpected error on attempt %d/%d for %s: %s. Retrying...",
                    attempt,
                    self.max_retries,
                    operation_name,
                    exc,
                )
                await asyncio.sleep(delay)
                delay = min(delay * self.backoff_multiplier, self.max_delay)

        if isinstance(last_exception, BlockchainError):
            raise last_exception
        if isinstance(last_exception, (TimeoutError, asyncio.TimeoutError)):
            raise ProviderTimeoutError(f"Provider timed out during {operation_name}")
        raise ProviderUnavailableError(
            f"Provider failed after {self.max_retries} attempts: {last_exception}"
        )


class ProviderRateLimiter:
    """
    Sliding window rate limiter and concurrency limiter per external blockchain provider.
    Prevents investigators and background tasks from exhausting external provider quotas.
    """

    def __init__(self, requests_per_second: float = 5.0, max_concurrent: int = 4):
        self.interval = 1.0 / max(requests_per_second, 0.1)
        self.max_concurrent = max_concurrent
        self._lock = asyncio.Lock()
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._last_call_time = 0.0

    async def acquire(self) -> None:
        await self._semaphore.acquire()
        try:
            async with self._lock:
                now = time.monotonic()
                elapsed = now - self._last_call_time
                if elapsed < self.interval:
                    wait_time = self.interval - elapsed
                    await asyncio.sleep(wait_time)
                self._last_call_time = time.monotonic()
        finally:
            self._semaphore.release()


class BlockchainCache:
    """
    In-memory evidentiary TTL cache for immutable blockchain transactions and block metadata.
    Does NOT cache rapidly changing state (e.g. pending transactions or live balances) indefinitely.
    """

    def __init__(self, default_ttl_seconds: int = 300, tx_ttl_seconds: int = 3600):
        self._cache: dict[str, tuple[float, Any]] = {}
        self.default_ttl = default_ttl_seconds
        self.tx_ttl = tx_ttl_seconds
        self._lock = asyncio.Lock()

    def _make_key(self, namespace: str, identifier: str) -> str:
        return f"{namespace}:{identifier.lower().strip()}"

    async def get(self, namespace: str, identifier: str) -> Any | None:
        key = self._make_key(namespace, identifier)
        async with self._lock:
            entry = self._cache.get(key)
            if not entry:
                return None
            expiry, value = entry
            if time.monotonic() > expiry:
                del self._cache[key]
                return None
            return value

    async def set(
        self, namespace: str, identifier: str, value: Any, ttl: int | None = None
    ) -> None:
        key = self._make_key(namespace, identifier)
        effective_ttl = (
            ttl if ttl is not None else (self.tx_ttl if namespace == "tx" else self.default_ttl)
        )
        async with self._lock:
            # Memory safety: Evict expired keys if cache grows large
            if len(self._cache) > 2000:
                now = time.monotonic()
                expired = [k for k, (exp, _) in self._cache.items() if exp < now]
                for k in expired:
                    del self._cache[k]

            self._cache[key] = (time.monotonic() + effective_ttl, value)

    async def clear(self) -> None:
        async with self._lock:
            self._cache.clear()
