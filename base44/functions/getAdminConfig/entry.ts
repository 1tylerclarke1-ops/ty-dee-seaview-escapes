import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { PRICING_SETTINGS } from "../../shared/pricing.ts";
import { SEASONS, BOOKING_RULES } from "../../shared/bookingRules.ts";
import { pricingFingerprint } from "../../shared/pricingFingerprint.ts";

// Admin-only: reports configuration health for the dashboard banner. Currently
// checks OWNER_EMAIL (where booking alerts are sent). No fallback — an unset
// secret is surfaced as a configuration problem, not hidden behind a default.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin required" }, { status: 403 });
    }
    const ownerEmail = secrets.get("OWNER_EMAIL");
    const ownerSet = !!(ownerEmail && ownerEmail.trim());
    return Response.json({
      owner_email_set: ownerSet,
      owner_email_preview: ownerSet ? maskEmail(ownerEmail.trim()) : null,
      server_pricing_fingerprint: pricingFingerprint(PRICING_SETTINGS, SEASONS, BOOKING_RULES),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function maskEmail(e) {
  const at = e.indexOf("@");
  if (at < 2) return e;
  return `${e.slice(0, 2)}…@${e.slice(at + 1)}`;
}