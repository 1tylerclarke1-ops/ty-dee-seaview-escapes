// Return-to-site verification — the PRIMARY confirmation path. Retrieves the
// Stripe session server-side and verifies payment_status=paid, currency=GBP,
// and amount matches the pricing engine. Never trusts the browser's word that
// payment succeeded. Delegates to the shared confirmBookingPayment helper
// (idempotent, race-condition guarded) which is also used by the webhook.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { retrieveSession } from "../../shared/stripe.ts";
import { confirmBookingPayment } from "../../shared/paymentConfirmation.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { session_id } = body || {};
    if (!session_id) {
      return Response.json({ error: "session_id required" }, { status: 400 });
    }

    const session = await retrieveSession(session_id);
    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const bookingId = session.client_reference_id || (session.metadata && session.metadata.booking_id);
    if (!bookingId) {
      return Response.json({ error: "No booking reference on this session" }, { status: 400 });
    }

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    if (!booking) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    const result = await confirmBookingPayment(base44, booking, session);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}