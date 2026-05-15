/**
 * In-memory rate limiter. Cheap, single-process, NOT a distributed
 * solution — production should swap to Upstash. Good enough for v1
 * to absorb spam clicks and runaway scripts.
 *
 * Per-actor buckets keyed by `${actor}::${action}`. Each bucket allows
 * `max` events per `windowMs`; older events outside the window are
 * dropped.
 */

type Bucket = { events: number[] };
const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 5000;

export function rateLimit({
  actor,
  action,
  max,
  windowMs,
}: {
  actor: string;
  action: string;
  max: number;
  windowMs: number;
}): { allowed: boolean; retryAfterMs: number } {
  const key = `${actor}::${action}`;
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { events: [] };
    buckets.set(key, bucket);
  }
  // Drop events outside the window.
  bucket.events = bucket.events.filter((ts) => now - ts < windowMs);
  if (bucket.events.length >= max) {
    const earliest = bucket.events[0];
    return { allowed: false, retryAfterMs: windowMs - (now - earliest) };
  }
  bucket.events.push(now);

  // Cap the map's growth in long-running processes by evicting the
  // oldest cold buckets when we exceed MAX_BUCKETS.
  if (buckets.size > MAX_BUCKETS) {
    const stale: string[] = [];
    for (const [k, b] of buckets) {
      if (b.events.length === 0 || now - b.events[b.events.length - 1] > windowMs) {
        stale.push(k);
        if (stale.length > MAX_BUCKETS / 4) break;
      }
    }
    for (const k of stale) buckets.delete(k);
  }

  return { allowed: true, retryAfterMs: 0 };
}
