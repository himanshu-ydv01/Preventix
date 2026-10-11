// Small in-memory limiter suitable for a single-process development deployment.
// Use a shared store (e.g. Redis) when running multiple API instances.
const buckets = new Map();
export function rateLimit({ windowMs = 60_000, max = 180, message = 'Too many requests. Please retry shortly.' } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) return res.status(429).json({ error: { code: 'RATE_LIMITED', message } });
    if (buckets.size > 5000) for (const [id, value] of buckets) if (value.resetAt <= now) buckets.delete(id);
    next();
  };
}
