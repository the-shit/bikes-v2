/**
 * Tiny in-memory sliding-window limiter for POST /api/feedback.
 */

export function createRateLimiter({
  windowMs = 60_000,
  max = 8,
  now = () => Date.now(),
} = {}) {
  const hits = new Map();
  return {
    allow(ip) {
      const t = now();
      const key = ip || 'unknown';
      const prev = (hits.get(key) || []).filter((stamp) => t - stamp < windowMs);
      if (prev.length >= max) {
        hits.set(key, prev);
        return false;
      }
      prev.push(t);
      hits.set(key, prev);
      return true;
    },
  };
}
