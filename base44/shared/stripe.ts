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