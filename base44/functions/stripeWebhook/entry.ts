// Stripe webhook endpoint — the SAFETY NET for the return-to-site path.
// Verifies the signature, deduplicates by event id (idempotent), logs every
// verified event to PaymentLog, and processes checkout.session.completed by
// delegating to the same confirmBookingPayment helper the return-to-site uses.
// The same event twice never double-confirms or double-emails: the PaymentLog
// dedup skips re-seen events, and confirmBookingPayment skips bookings that
// are already deposit_paid/confirmed.
//
// Unauthenticated (called by Stripe). Uses the service role to write PaymentLog
// and Booking records (bypassing admin-only RLS).

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { constructWebhookEvent } from '../../shared/stripe.ts';
import { confirmBookingPayment } from '../../shared/paymentConfirmation.ts';

export default async function(req) {
  const base44 = createClientFromRequest(req);
  try {
    const webhookSecret = secrets.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      return Response.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature") || "";

    // Verify signature — throws on mismatch (async form, SubtleCrypto).
    const event = await constructWebhookEvent(body, signature, webhookSecret);

    // Idempotency: skip if we've already logged this event.
    const existing = await base44.asServiceRole.entities.PaymentLog.filter({ stripe_event_id: event.id });
    if (existing && existing.length) {
      return Response.json({ received: true, duplicate: true });
    }

    // Log the verified event.
    const log = await base44.asServiceRole.entities.PaymentLog.create({
      stripe_event_id: event.id,
      event_type: event.type,
      api_version: event.api_version,
      livemode: event.livemode,
      stripe_created: event.created,
      payload: JSON.stringify(event),
      object_id: (event.data && event.data.object && event.data.object.id) || null,
      object_type: (event.data && event.data.object && event.data.object.object) || null,
      processed: false,
    });

    // Process checkout.session.completed — the safety net for the return-to-site
    // path. confirmBookingPayment is idempotent (skips if already confirmed).
    if (event.type === "checkout.session.completed") {
      const session = event.data && event.data.object;
      const bookingId = session && (session.client_reference_id || (session.metadata && session.metadata.booking_id));
      if (bookingId) {
        try {
          const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
          if (booking) {
            await confirmBookingPayment(base44, booking, session);
          }
          await base44.asServiceRole.entities.PaymentLog.update(log.id, { processed: true });
        } catch (e) {
          await base44.asServiceRole.entities.PaymentLog.update(log.id, { processed: false, error: e.message });
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    // Bad signature or unexpected error — do not log untrusted payloads.
    return Response.json({ error: error.message }, { status: 400 });
  }
}