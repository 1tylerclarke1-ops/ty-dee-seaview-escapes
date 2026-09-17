// Public, token-based balance payment session creation. A guest with an
// outstanding balance uses their existing manage/cancel link to pay by card.
// Same security model as getBookingByToken: token-only lookup, rate-limited,
// identical generic 404 for every non-active case so no response confirms a
// token existed. Creates a Stripe Checkout Session for the balance amount and
// returns the URL — the guest is redirected there to pay.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { addDaysIso, todayIso } from "../../shared/cancellation.ts";
import { toMinorUnits } from "../../shared/money.ts";
import { createCheckoutSession as stripeCreateSession } from "../../shared/stripe.ts";
import { rateLimit } from "../../shared/rateLimit.ts";
import { appOrigin } from "../../shared/origin.ts";

export default async function (req) {
  if (!rateLimit(req, "createBalanceSession", 10, 60_000)) {
    return Response.json({ state: "rate_limited" }, { status: 429 });
  }
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim();

    // Resolve by TOKEN ONLY — same as getBookingByToken.
    const found = token
      ? await base44.asServiceRole.entities.Booking.filter({ cancel_token: token })
      : [];
    const booking = found && found[0];

    // Every non-active case returns the same generic 404.
    if (!booking) return Response.json({ state: "not_found" }, { status: 404 });
    if (booking.status === "cancelled") return Response.json({ state: "not_found" }, { status: 404 });
    const departureIso = addDaysIso(booking.arrival_date, booking.nights);
    if (departureIso <= todayIso()) return Response.json({ state: "not_found" }, { status: 404 });
    if (booking.status !== "deposit_paid") return Response.json({ state: "not_found" }, { status: 404 });

    const totalPaid = Number(booking.deposit_paid || 0) + Number(booking.balance_paid || 0);
    const balanceOwed = Math.max(Number(booking.gross_revenue || 0) - totalPaid, 0);
    if (balanceOwed <= 0) return Response.json({ state: "not_found" }, { status: 404 });

    const origin = appOrigin(req);
    let session;
    try {
      session = await stripeCreateSession({
        amountPence: toMinorUnits(balanceOwed),
        reference: booking.id,
        metadata: {
          booking_id: booking.id,
          payment_type: "balance",
        },
        successUrl: `${origin}/booking/return?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/booking/cancelled?session_id={CHECKOUT_SESSION_ID}`,
        email: booking.guest_email,
      });
    } catch (e) {
      return Response.json({ error: `Could not start checkout: ${e.message}` }, { status: 502 });
    }

    // Store the balance session id — used as the atomic guard in confirmation.
    await base44.asServiceRole.entities.Booking.update(booking.id, {
      stripe_session_id: session.id,
      balance_session_created_at: new Date().toISOString(),
    });

    return Response.json({ ok: true, url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}