import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { computeGaps } from "../../shared/gaps.ts";
import { formatLong, gbp, formatShort } from "../../shared/pricing.ts";
import { appBaseUrl } from "../../shared/origin.ts";
import { ownerEmail } from "../../shared/bookingEmail.ts";

// Weekly job (Saturdays 06:00). Reduced scope: it does NOT apply discounts.
// It expires stale holds, then emails the owner the gaps view for the next
// 30 days. Season roll-forward as drafts is handled separately. Admin/service
// context — invoked by the scheduled workflow, no end-user auth.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const bookings = await base44.asServiceRole.entities.Booking.list("-arrival_date", 500);

    // Expire stale holds (weekly safety net — the hourly "Expire holds" workflow
    // is the primary). An abandoned checkout is "expired", not "cancelled".
    const now = Date.now();
    let expired = 0;
    for (const b of bookings || []) {
      if (b.status === "held" && b.hold_expires_at && new Date(b.hold_expires_at).getTime() < now) {
        try {
          await base44.asServiceRole.entities.Booking.update(b.id, { status: "expired" });
          expired++;
        } catch { /* keep going */ }
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const active = (bookings || []).filter((b) => b.status !== "cancelled" && b.status !== "expired");
    const view = computeGaps(active, today, 30);

    const lines = [];
    lines.push(`Weekly gaps review — ${formatLong(today)}`);
    lines.push("");
    lines.push(`Unsold stays (next 30 days): ${view.unsold.length}`);
    for (const s of view.unsold.slice(0, 40)) {
      const flag = s.protected ? " [protected]" : (s.offer_eligible ? "" : " [monitor]");
      lines.push(
        `  ${formatShort(s.arrival_date)} · ${s.nights}n · ${s.season} · ` +
        `${gbp(s.current_price)} · net ${gbp(s.net_per_night)}/n · ` +
        `${s.days_to_arrival}d${flag}`
      );
    }
    lines.push("");
    lines.push(`Orphan gaps (sell by hand): ${view.orphans.length}`);
    for (const g of view.orphans) {
      lines.push(`  ${formatShort(g.start_date)} · ${g.nights}n · between ${g.before} and ${g.after}`);
    }
    lines.push("");
    lines.push(`Expired holds: ${expired}`);
    lines.push("");
    lines.push(`Review and create offers in the admin dashboard:`);
    lines.push(`${appBaseUrl()}/admin`);

    const body = lines.join("\n");
    const owner = ownerEmail();
    if (!owner) {
      console.error("[config] OWNER_EMAIL not set — weekly gaps email skipped");
    } else {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: owner,
          subject: `Weekly gaps review — ${formatShort(today)}`,
          body,
        });
      } catch {
        /* email may fail without a custom domain; the job still ran */
      }
    }

    return Response.json({
      ok: true,
      expired_holds: expired,
      unsold: view.unsold.length,
      orphans: view.orphans.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}