// Best-effort per-IP rate limiting for public, unauthenticated endpoints.
// In-memory sliding window, scoped per function. State is per-instance (a
// serverless runtime may run several instances), so the cap is a best-effort
// per-instance limit — but combined with a 64-character unguessable token it
// makes brute-force token guessing wholly impractical: an attacker gets only
// a handful of guesses per minute per instance against 16^64 possibilities.
const buckets = new Map<string, number[]>();
const MAX_BUCKETS = 2000;

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "unknown";
}

// Returns true if the request is allowed, false if the IP has exceeded `max`
// requests within `windowMs` for this `scope`. Never throws.
export function rateLimit(req: Request, scope: string, max: number, windowMs: number): boolean {
  const ip = clientIp(req);
  const key = `${scope}:${ip}`;
  const now = Date.now();
  // Bound memory: if the map has grown large, drop fully-expired buckets.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) {
      if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
    }
  }
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}