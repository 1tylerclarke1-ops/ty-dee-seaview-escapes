// The single Stripe service module. Every Stripe call in the app goes through
// here so the provider can be swapped without touching the booking engine.
//
// The secret key is read server-side only (via base44:runtime secrets) and is
// never returned to the browser, never logged, and never included in error
// messages. This module lives under base44/ which is server-side only and is
// never imported from the client bundle.

import Stripe from "npm:stripe@22.6.2";
import { secrets } from "base44:runtime";
import { toMinorUnits, fromMinorUnits } from "./money.ts";

export { toMinorUnits, fromMinorUnits };

let _client = null;

// Lazily build the Stripe client. Constructed inside a function (not at module
// top level) so a missing key throws inside the caller's try/catch, not at boot.
export function getStripe() {
  const key = secrets.get("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set. Add it in Settings → Environment variables.");
  }
  if (!_client) {
    _client = new Stripe(key);
  }
  return _client;
}

// livemode is determined by the key prefix — the Account object does not expose
// it directly. Test keys: sk_test_ / rk_test_. Live keys: sk_live_ / rk_live_.
export function isLiveMode() {
  const key = secrets.get("STRIPE_SECRET_KEY");
  if (!key) return false;
  return /^(sk|rk)_live_/.test(key);
}

// Retrieve the account the secret key belongs to.
export async function retrieveAccount() {
  const stripe = getStripe();
  return await stripe.accounts.retrieve();
}

// Verify a webhook signature and reconstruct the event. Must use the async
// form — the sync constructEvent() throws in this runtime (SubtleCrypto).
export async function constructWebhookEvent(body, signature, secret) {
  const stripe = getStripe();
  return await stripe.webhooks.constructEventAsync(body, signature, secret);
}

// Estimated Stripe processing fee on a GBP charge. Stripe does not return this
// fee on a refund, so the owner is out of pocket by it. This is the UK DOMESTIC
// card rate (1.5% + £0.20) ONLY — European (EEA) cards are ~2.5% and non-UK /
// non-EEA cards higher. For the true fee, use retrieveChargeFee() once the
// payment flow stores the charge id on the booking.
const STRIPE_UK_DOMESTIC_RATE = 0.015;
const STRIPE_UK_DOMESTIC_FIXED_PENCE = 20;

export function estimateStripeFee(amountPounds) {
  const amount = Math.max(0, Number(amountPounds) || 0);
  const feePence = Math.round(amount * 100 * STRIPE_UK_DOMESTIC_RATE + STRIPE_UK_DOMESTIC_FIXED_PENCE);
  return feePence / 100;
}

// Retrieve the actual processing fee Stripe charged on a charge, from its
// balance transaction. Call this from the webhook handler when a payment
// succeeds and store the result on the Booking (stripe_fee) — then cancelBooking
// uses the real fee instead of the UK-domestic estimate above. Returns null if
// the balance transaction or fee cannot be read.
export async function retrieveChargeFee(chargeId) {
  const stripe = getStripe();
  const charge = await stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] });
  const fee = charge.balance_transaction && charge.balance_transaction.fee;
  return typeof fee === "number" ? fromMinorUnits(fee) : null;
}

// Create a Stripe Checkout Session for immediate card payment in GBP.
// Cards only, immediate capture (no authorisation holds). The booking id is
// set as client_reference_id and embedded in metadata for reconciliation.
export async function createCheckoutSession({ amountPence, reference, metadata, successUrl, cancelUrl, email }) {
  const stripe = getStripe();
  return await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "gbp",
        unit_amount: amountPence,
        product_data: { name: "Ty Dee Seaview Escapes — holiday booking" },
      },
      quantity: 1,
    }],
    client_reference_id: reference,
    metadata,
    customer_email: email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    billing_address_collection: "auto",
    // Disable Stripe's adaptive pricing so the guest is always charged in GBP.
    // With it on, Stripe may convert to the card's local currency, which would
    // break the server-side amount_total (GBP pence) verification below.
    adaptive_pricing: { enabled: false },
  });
}

// Retrieve a Checkout Session by id — for return-to-site verification.
export async function retrieveSession(sessionId) {
  const stripe = getStripe();
  return await stripe.checkout.sessions.retrieve(sessionId);
}

// Issue a refund for a Payment Intent. amountPence optional — omit for full.
export async function createRefund({ paymentIntentId, amountPence }) {
  const stripe = getStripe();
  const params = { payment_intent: paymentIntentId };
  if (amountPence != null) params.amount = amountPence;
  return await stripe.refunds.create(params);
}

// Retrieve the actual processing fee from a Payment Intent's latest charge
// balance transaction. Returns pounds, or null if unavailable.
export async function retrievePaymentFee(paymentIntentId) {
  const stripe = getStripe();
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge.balance_transaction"] });
  const fee = pi.latest_charge && pi.latest_charge.balance_transaction && pi.latest_charge.balance_transaction.fee;
  return typeof fee === "number" ? fromMinorUnits(fee) : null;
}