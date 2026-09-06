"""
In-Memory Sliding Window Rate Limiter
Provides per-user and per-IP rate limiting for sensitive API endpoints.
No external dependencies — uses a simple time-bucketed counter approach.
"""

import time
from collections import defaultdict
from threading import Lock

from apps.api.src.core.config import settings
from fastapi import HTTPException, Request, status


class RateLimiter:
    """Thread-safe sliding window rate limiter."""

    def __init__(self):
        self._buckets: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def reset(self) -> None:
        """Clears all rate limiting buckets (useful for tests)."""
        with self._lock:
            self._buckets.clear()

    def _cleanup_bucket(self, key: str, window_seconds: float) -> None:
        """Remove expired timestamps from the bucket."""
        now = time.monotonic()
        cutoff = now - window_seconds
        self._buckets[key] = [ts for ts in self._buckets[key] if ts > cutoff]

    def check_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: float = 60.0,
    ) -> tuple[bool, int]:
        """
        Returns (allowed, remaining_requests).
        If not allowed, raises HTTP 429.
        """
        with self._lock:
            self._cleanup_bucket(key, window_seconds)
            current_count = len(self._buckets[key])

            if current_count >= max_requests:
                return False, 0

            self._buckets[key].append(time.monotonic())
            return True, max_requests - current_count - 1

    def enforce(
        self,
        key: str,
        max_requests: int,
        window_seconds: float = 60.0,
        category: str = "requests",
    ) -> None:
        """Enforce rate limit or raise 429."""
        allowed, remaining = self.check_rate_limit(key, max_requests, window_seconds)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {category}. "
                f"Maximum {max_requests} requests per {int(window_seconds)} seconds.",
                headers={
                    "Retry-After": str(int(window_seconds)),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                },
            )


# Singleton instance
_rate_limiter = RateLimiter()


def get_rate_limiter() -> RateLimiter:
    return _rate_limiter


def rate_limit_key_from_request(request: Request, user_id: str | None = None) -> str:
    """Build a rate-limit key from user ID (preferred) or client IP."""
    if user_id:
        return f"user:{user_id}"
    if request.client:
        return f"ip:{request.client.host}"
    return "ip:unknown"
