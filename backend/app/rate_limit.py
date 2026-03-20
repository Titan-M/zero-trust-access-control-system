import threading
import time

# Lightweight in-memory limiter suitable for a single-process deployment.
# For distributed deployments, move this to Redis or another shared store.
_buckets: dict[str, tuple[float, int]] = {}
_lock = threading.Lock()


def allow_request(key: str, limit: int, window_seconds: int = 60) -> bool:
    now = time.monotonic()
    with _lock:
        window_start, count = _buckets.get(key, (now, 0))

        if now - window_start >= window_seconds:
            window_start, count = now, 0

        if count >= limit:
            _buckets[key] = (window_start, count)
            return False

        _buckets[key] = (window_start, count + 1)
        return True
