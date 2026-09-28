import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { PRICING_SETTINGS, calculatePrice } from "../../shared/pricing.ts";
import { SEASONS, BOOKING_RULES, allowedLengthsForArrival } from "../../shared/bookingRules.ts";
import { pricingFingerprint } from "../../shared/pricingFingerprint.ts";

// Scans every season × LOS tier (7/14/21/28) and returns the cases where the
// configured discount is capped by the min_net_per_night floor — so the owner
// is told in the dashboard when a discount they set isn't fully applied.
function losFloorWarnings() {
  const lengths = [7, 14, 21, 28];
  const warnings = [];
  for (const season of SEASONS) {
    const start = new Date(season.start_date + "T00:00:00Z");
    const end = new Date(season.end_date + "T00:00:00Z");
    let rep = null;
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      if (allowedLengthsForArrival(d).includes(7)) { rep = new Date(d); break; }
    }
    if (!rep) continue;
    for (const len of lengths) {
      const p = calculatePrice(rep, len, 0);
      if (p && p.losDiscountFloorLimited) {
        warnings.push({
          season: season.name,
          nights: len,
          percent: p.losDiscountPercent,
          applied: p.losDiscount,
        });
      }
    }
  }
  return warnings;
}

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
      los_floor_warnings: losFloorWarnings(),
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