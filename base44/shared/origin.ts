// The app's public origin — the single source of truth for every absolute URL
// the backend builds (Stripe redirects, email links, sitemap, admin links).
//
// Prefers the request's own Origin header (so links always match the domain
// the guest is actually on), then the APP_BASE_URL secret, then the verified
// custom domain as a last resort. To change the domain later, update
// APP_BASE_URL in Settings → Environment variables — no code edit needed.
import { secrets } from "base44:runtime";

const DEFAULT_ORIGIN = "https://tydeeseaviewescapes.co.uk";

function clean(u) {
  return (u || "").replace(/\/+$/, "");
}

// Origin for a request-handling function — uses the request's own origin when
// available (Stripe redirects then match whatever domain the guest is on).
export function appOrigin(req) {
  const origin = req?.headers?.get?.("origin");
  if (origin) return clean(origin);
  const fromSecret = secrets.get("APP_BASE_URL");
  if (fromSecret) return clean(fromSecret);
  return DEFAULT_ORIGIN;
}

// Origin with no request context (scheduled jobs, sitemap, webhooks) —
// env var only, falling back to the custom domain.
export function appBaseUrl() {
  const fromSecret = secrets.get("APP_BASE_URL");
  if (fromSecret) return clean(fromSecret);
  return DEFAULT_ORIGIN;
}