// Public: resolve a single booking by its long single-use manage/cancel token.
// No account, no password — the token opens one booking and only that booking.
// Never returns the guest list or any other booking. The token is invalidated
// (no booking details exposed) once the stay has completed or the booking has
// been cancelled — those states return only a state flag, not the booking.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { addDaysIso, todayIso } from "../../shared/cancellation.ts";
import { balanceDueIso } from "../../shared/pricing.ts";
import { computeRefundPreview } from "../../shared/cancellationPreview.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    if (!token) return Response.json({ error: "Invalid link" }, { status: 400 });

    const found = await base44.asServiceRole.entities.Booking.filter({ cancel_token: token });
    const booking = found && found[0];
    if (!booking) {
      // No match — expired/invalidated token. Do not reveal whether a booking
      // ever existed for this token.
      return Response.json({ state: "not_found" }, { status: 404 });
    }

    // Invalidation: a cancelled booking exposes no details (the cancellation
    // email is the guest's record).
    if (booking.status === "cancelled") {
      return Response.json({ state: "cancelled" });
    }

    // Invalidation: a completed stay exposes no details.
    const departureIso = addDaysIso(booking.arrival_date, booking.nights);
    if (departureIso <= todayIso()) {
      return Response.json({ state: "completed" });
    }

    // Only a paid, upcoming booking is manageable online.
    const cancellable = booking.status === "deposit_paid" || booking.status === "confirmed";
    if (!cancellable) {
      return Response.json({ state: "not_cancellable", status: booking.status });
    }

    const preview = await computeRefundPreview(base44, booking);
    const totalPaid = Number(booking.deposit_paid || 0) + Number(booking.balance_paid || 0);
    const balanceOwed = Math.max(Number(booking.gross_revenue || 0) - totalPaid, 0);

    return Response.json({
      state: "active",
      booking: {
        id: booking.id,
        arrival_date: booking.arrival_date,
        departure_date: departureIso,
        nights: booking.nights,
        guests: booking.guests || 0,
        dog_count: booking.dog_count || 0,
        status: booking.status,
        gross_revenue: Number(booking.gross_revenue || 0),
        deposit_paid: Number(booking.deposit_paid || 0),
        balance_paid: Number(booking.balance_paid || 0),
        balance_owed: balanceOwed,
        balance_due_date: balanceDueIso(booking.arrival_date),
        cooling_off_expires_at: booking.cooling_off_expires_at || null,
      },
      preview,
      cancellable: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}