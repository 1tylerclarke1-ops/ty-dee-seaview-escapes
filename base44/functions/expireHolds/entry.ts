import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { requireInternal } from "../../shared/internalCall.ts";

// Hourly housekeeping for abandoned checkouts. Marks "held" bookings whose
// 30-minute hold_expires_at has passed as "expired" — a status distinct from
// "cancelled", so an abandoned checkout (never finished) is not confused with a
// real cancellation (guest changed their mind). Also purges "expired" records
// older than 90 days. Does NOT release dates: the availability check already
// skips expired holds in real time, so this is housekeeping only. No guest
// email — they abandoned a checkout, they don't need chasing. Service context.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const _guard = await requireInternal(base44, req);
    if (_guard) return _guard;
    const now = Date.now();

    // Mark expired holds.
    const held = await base44.asServiceRole.entities.Booking.filter(
      { status: "held" },
      "-created_date",
      500
    );
    let expired = 0;
    for (const b of held || []) {
      if (b.hold_expires_at && new Date(b.hold_expires_at).getTime() < now) {
        try {
          await base44.asServiceRole.entities.Booking.update(b.id, { status: "expired" });
          expired++;
        } catch { /* keep going */ }
      }
    }

    // Purge expired records older than 90 days.
    const purgeBefore = now - 90 * 86400000;
    const oldExpired = await base44.asServiceRole.entities.Booking.filter(
      { status: "expired" },
      "-created_date",
      500
    );
    let purged = 0;
    for (const b of oldExpired || []) {
      const created = b.created_date ? new Date(b.created_date).getTime() : 0;
      if (created && created < purgeBefore) {
        try {
          await base44.asServiceRole.entities.Booking.delete(b.id);
          purged++;
        } catch { /* keep going */ }
      }
    }

    return Response.json({ ok: true, expired, purged });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}