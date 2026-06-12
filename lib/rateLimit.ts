type RateBucket = {
  count: number;
  resetAt: number;
  windowStart: number;
  windowMs: number;
};

// TODO: Replace with Redis (for example ioredis) before production deployment.
// This in-memory store is not shared across replicas.
const buckets = new Map<string, RateBucket>();

export function evictExpiredRateLimits(now = Date.now()) {
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.windowStart > bucket.windowMs * 2) buckets.delete(key);
  }
}

const cleanupTimer = setInterval(() => {
  evictExpiredRateLimits();
}, 60_000);
cleanupTimer.unref?.();

export function isRateLimited(
  key: string,
  maxRequests: number,
  windowMs = 60_000
) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
      windowStart: now,
      windowMs,
    });
    return false;
  }

  bucket.count += 1;
  return bucket.count > maxRequests;
}

export function clearRateLimitForTests() {
  buckets.clear();
}
