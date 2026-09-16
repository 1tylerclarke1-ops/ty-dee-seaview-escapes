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