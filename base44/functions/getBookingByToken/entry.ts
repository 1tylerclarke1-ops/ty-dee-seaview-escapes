// Public: resolve a single booking by its long single-use manage/cancel token.
// No account, no password — the token opens one booking and only that booking.
//
// Security:
//   • The booking is resolved by TOKEN ONLY — never by booking id or email
//     (both are enumerable). A booking id anywhere in the request is ignored.
//   • Every non-active case (no token, no match, cancelled, completed, or a
//     not-yet-paid status) returns the SAME generic { state: "not_found" }
//     response. No message ever confirms a token existed.
//   • A per-IP rate limit caps guess speed.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { addDaysIso, todayIso } from "../../shared/cancellation.ts";
import { balanceDueIso } from "../../shared/pricing.ts";
import { computeRefundPreview } from "../../shared/cancellationPreview.ts";
import { rateLimit } from "../../shared/rateLimit.ts";

export default async function (req) {
  // Rate limit first — before any token work. 20 lookups/min per IP is far
  // beyond legitimate use (one page load = one lookup) but caps guessing.
  if (!rateLimit(req, "getBookingByToken", 20, 60_000)) {
    return Response.json({ state: "rate_limited" }, { status: 429 });
  }
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim();

    // Resolve by TOKEN ONLY. No booking id or email is ever queried.
    const found = token
      ? await base44.asServiceRole.entities.Booking.filter({ cancel_token: token })
      : [];
    const booking = found && found[0];

    // Every non-active case returns the same generic 404 — indistinguishable
    // to a caller, so no response confirms a token ever existed.
    if (!booking) return Response.json({ state: "not_found" }, { status: 404 });
    if (booking.status === "cancelled") return Response.json({ state: "not_found" }, { status: 404 });
    const departureIso = addDaysIso(booking.arrival_date, booking.nights);
    if (departureIso <= todayIso()) return Response.json({ state: "not_found" }, { status: 404 });
    if (booking.status !== "deposit_paid" && booking.status !== "confirmed") {
      return Response.json({ state: "not_found" }, { status: 404 });
    }

    // Only a paid, upcoming booking is manageable online.
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