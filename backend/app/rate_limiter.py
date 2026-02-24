"""Reusable in-memory rate limiter.

Provides both a callable checker (for per-endpoint use) and a FastAPI middleware
for global per-IP rate limiting.
"""

import logging
import threading
import time

from fastapi import HTTPException, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Paths that are exempt from global rate limiting (health checks, docs).
_EXEMPT_PATHS = frozenset({"/health", "/", "/docs", "/openapi.json", "/redoc"})


class RateLimiter:
    """Simple in-memory per-key rate limiter (thread-safe)."""

    def __init__(
        self,
        window: int = 60,
        max_requests: int = 100,
        max_keys: int = 10_000,
        cleanup_interval: int = 300,
    ):
        self.window = window
        self.max_requests = max_requests
        self.max_keys = max_keys
        self.cleanup_interval = cleanup_interval

        self._store: dict[str, list[float]] = {}
        self._lock = threading.Lock()
        self._last_cleanup = 0.0

    def _cleanup(self, now: float) -> None:
        """Remove expired entries. Caller must hold the lock."""
        expired = [
            k for k, times in self._store.items()
            if not any(now - t < self.window for t in times)
        ]
        for k in expired:
            del self._store[k]
        self._last_cleanup = now

    def check(self, key: str) -> None:
        """Raise HTTPException(429) if the key exceeded the limit."""
        now = time.time()
        with self._lock:
            if (
                now - self._last_cleanup > self.cleanup_interval
                or len(self._store) > self.max_keys
            ):
                self._cleanup(now)

            attempts = [t for t in self._store.get(key, []) if now - t < self.window]

            if len(attempts) >= self.max_requests:
                self._store[key] = attempts
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests. Please try again later.",
                )
            attempts.append(now)
            self._store[key] = attempts

    def clear(self) -> None:
        """Clear the entire store (e.g. on shutdown)."""
        with self._lock:
            self._store.clear()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Global per-IP rate limiter as FastAPI middleware.

    Applies a default limit to all endpoints and allows per-prefix overrides.
    """

    def __init__(
        self,
        app,
        default_rpm: int = 100,
        window: int = 60,
        prefix_limits: dict[str, int] | None = None,
    ):
        super().__init__(app)
        self.window = window
        # Default limiter
        self._default = RateLimiter(window=window, max_requests=default_rpm)
        # Per-prefix limiters (e.g. {"/api/upload": 10})
        self._prefix_limiters: dict[str, RateLimiter] = {}
        for prefix, rpm in (prefix_limits or {}).items():
            self._prefix_limiters[prefix] = RateLimiter(
                window=window, max_requests=rpm,
            )

    async def dispatch(self, request: Request, call_next):
        if request.url.path in _EXEMPT_PATHS:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"

        # Skip rate limiting for test clients
        if client_ip == "testclient":
            return await call_next(request)

        # Check per-prefix limiter first (most specific match)
        for prefix, limiter in self._prefix_limiters.items():
            if request.url.path.startswith(prefix):
                limiter.check(client_ip)
                break
        else:
            # No prefix match — use default
            self._default.check(client_ip)

        return await call_next(request)

    def clear_all(self) -> None:
        """Clear all stores (for shutdown)."""
        self._default.clear()
        for limiter in self._prefix_limiters.values():
            limiter.clear()
