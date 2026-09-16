// Stripe webhook endpoint. Verifies the signature, logs the raw event to the
// PaymentLog entity, and returns 200. No business logic yet — events are
// stored for later processing.
//
// This endpoint is unauthenticated (called by Stripe). It uses the service
// role to write PaymentLog records (bypassing RLS, which is admin-only).
// Signature verification happens before any data is trusted or stored.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { constructWebhookEvent } from '../../shared/stripe.ts';

export default async function(req) {
  const base44 = createClientFromRequest(req);
  try {
    const webhookSecret = secrets.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      return Response.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature") || "";

    // Verify signature — throws on mismatch. Async form (SubtleCrypto).
    const event = await constructWebhookEvent(body, signature, webhookSecret);

    // Log the verified event. No business logic yet.
    await base44.asServiceRole.entities.PaymentLog.create({
      stripe_event_id: event.id,
      event_type: event.type,
      api_version: event.api_version,
      livemode: event.livemode,
      stripe_created: event.created,
      payload: JSON.stringify(event),
      object_id: (event.data && event.data.object && event.data.object.id) || null,
      object_type: (event.data && event.data.object && event.data.object.object) || null,
      processed: false
    });

    return Response.json({ received: true });
  } catch (error) {
    // Bad signature or unexpected error — do not log untrusted payloads.
    return Response.json({ error: error.message }, { status: 400 });
  }
}