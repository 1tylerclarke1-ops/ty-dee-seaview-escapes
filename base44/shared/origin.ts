// The app's public origin — the single source of truth for every absolute URL
// the backend builds (Stripe redirects, email links, sitemap, admin links).
//
// appOrigin(req) honours the request's Origin header ONLY when its host matches
// one of the app's known domains (Origin is client-controlled and could otherwise
// redirect post-payment guests to an attacker site). Otherwise it falls back to
// the APP_BASE_URL secret. To change the domain later, update APP_BASE_URL in
// Settings → Environment variables — no code edit needed.
import { secrets } from "base44:runtime";

const DEFAULT_ORIGIN = "https://tydeeseaviewescapes.co.uk";

function clean(u) {
  return (u || "").replace(/\/+$/, "");
}

// Origin for a request-handling function — used to build Stripe redirect
// URLs, so the Origin header is never trusted blindly (it is client-
// controlled and could point at an attacker domain for post-payment
// phishing). We only honour it when its host matches one of the app's own
// known domains; otherwise we fall back to the APP_BASE_URL secret.
const ALLOWED_HOSTS = new Set([
  "tydeeseaviewescapes.co.uk",
  "ty-dee-stays.base44.app",
]);

function isAllowedOrigin(u) {
  try {
    const host = new URL(clean(u)).host;
    if (ALLOWED_HOSTS.has(host)) return true;
    // Also accept the host of the configured APP_BASE_URL secret, if set.
    const fromSecret = secrets.get("APP_BASE_URL");
    if (fromSecret) {
      try {
        if (new URL(clean(fromSecret)).host === host) return true;
      } catch {}
    }
    return false;
  } catch {
    return false;
  }
}

export function appOrigin(req) {
  const origin = req?.headers?.get?.("origin");
  if (origin && isAllowedOrigin(origin)) return clean(origin);
  return appBaseUrl();
}

// Origin with no request context (scheduled jobs, sitemap, webhooks) —
// env var only, falling back to the custom domain.
export function appBaseUrl() {
  const fromSecret = secrets.get("APP_BASE_URL");
  if (fromSecret) return clean(fromSecret);
  return DEFAULT_ORIGIN;
}