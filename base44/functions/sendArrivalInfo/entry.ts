// Arrival info email — two modes:
//   1. Manual (admin): { booking_id } provided → verify admin, send/resend to
//      that booking (force = true, so resend is allowed).
//   2. Daily job (scheduled): no booking_id → find all confirmed bookings
//      arriving within 3 days that haven't been sent, and send each.
//
// Never sends twice (tracked via arrival_info_sent_at), never for a cancelled
// booking. The lockbox code is read at send time from ArrivalInfoSettings.
// Failed sends are flagged on the booking (arrival_info_send_failed) so they
// surface prominently in the admin dashboard.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { daysBetween, todayIso } from "../../shared/cancellation.ts";
import { sendArrivalInfoForBooking } from "../../shared/arrivalInfo.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // --- Manual send (admin) ---
    if (body.booking_id) {
      const user = await base44.auth.me();
      if (!user || user.role !== "admin") {
        return Response.json({ error: "Admin required" }, { status: 403 });
      }
      const booking = await base44.asServiceRole.entities.Booking.get(body.booking_id);
      if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
      const result = await sendArrivalInfoForBooking(base44, booking, { force: true });
      return Response.json(result);
    }

    // --- Daily job ---
    const bookings = await base44.asServiceRole.entities.Booking.filter({
      status: "confirmed",
    });
    const today = todayIso();
    const sent = [];
    const failed = [];

    for (const b of bookings || []) {
      const days = daysBetween(today, b.arrival_date);
      if (days < 0 || days > 3) continue;
      if (b.arrival_info_sent_at) continue;

      // Re-fetch right before sending — the guest may have cancelled moments
      // ago, during this run.
      const fresh = await base44.asServiceRole.entities.Booking.get(b.id).catch(() => null);
      if (!fresh || fresh.status !== "confirmed") continue;
      if (fresh.arrival_info_sent_at) continue;
      const daysFresh = daysBetween(today, fresh.arrival_date);
      if (daysFresh < 0 || daysFresh > 3) continue;

      const result = await sendArrivalInfoForBooking(base44, fresh, { force: false });
      if (result.sent) sent.push({ ref: fresh.reference });
      else if (result.error) failed.push({ ref: fresh.reference, error: result.error });
    }

    return Response.json({ ok: true, sent_count: sent.length, failed_count: failed.length, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}