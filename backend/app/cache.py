"""Simple in-memory TTL cache for expensive query results."""

import hashlib
import json
import logging
import threading
import time
from typing import Any

logger = logging.getLogger(__name__)


class TTLCache:
    """Thread-safe in-memory cache with per-key TTL."""

    def __init__(self, default_ttl: int = 300, max_size: int = 500):
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()
        self.default_ttl = default_ttl
        self.max_size = max_size

    def get(self, key: str) -> Any | None:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        ttl = ttl if ttl is not None else self.default_ttl
        with self._lock:
            # Evict oldest entries if over max size
            if len(self._store) >= self.max_size:
                self._evict_expired()
            if len(self._store) >= self.max_size:
                # Remove oldest entry
                oldest_key = min(self._store, key=lambda k: self._store[k][0])
                del self._store[oldest_key]
            self._store[key] = (time.monotonic() + ttl, value)

    def invalidate_prefix(self, prefix: str) -> int:
        """Remove all keys starting with prefix. Returns count removed."""
        with self._lock:
            keys = [k for k in self._store if k.startswith(prefix)]
            for k in keys:
                del self._store[k]
            if keys:
                logger.debug("Cache invalidated %d keys with prefix '%s'", len(keys), prefix)
            return len(keys)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def _evict_expired(self) -> None:
        """Remove expired entries. Caller must hold lock."""
        now = time.monotonic()
        expired = [k for k, (exp, _) in self._store.items() if now > exp]
        for k in expired:
            del self._store[k]


def make_cache_key(prefix: str, user_id: int, **kwargs) -> str:
    """Build a deterministic cache key from prefix, user_id, and params."""
    params = json.dumps(kwargs, sort_keys=True, default=str)
    h = hashlib.md5(params.encode(), usedforsecurity=False).hexdigest()[:8]
    return f"{prefix}:u{user_id}:{h}"


# Shared cache instance for analytics queries
analytics_cache = TTLCache(default_ttl=300, max_size=500)
