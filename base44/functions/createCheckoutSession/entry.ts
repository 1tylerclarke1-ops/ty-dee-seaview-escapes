// Creates a held booking and a Stripe Checkout Session for immediate card
// payment. Public (no auth) — uses the service role. Re-validates everything
// server-side (booking rules, season, guests, dogs), recalculates the total
// from the pricing engine (never trusts a figure from the browser), re-checks
// availability, then creates the booking as held with a 30-minute expiry and
// the Stripe session. Deposit if arrival is >60 days away, full amount inside.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { allowedLengthsForArrival, seasonForDate, SEASONS, BOOKING_RULES } from "../../shared/bookingRules.ts";
import { calculatePrice, isPayableInFullIso, PRICING_SETTINGS } from "../../shared/pricing.ts";
import { pricingFingerprint } from "../../shared/pricingFingerprint.ts";
import { toMinorUnits } from "../../shared/money.ts";
import { createCheckoutSession as stripeCreateSession } from "../../shared/stripe.ts";
import { isAvailable } from "../../shared/availability.ts";
import {
  normalizePolicy,
  buildPolicyText,
  DEFAULT_CANCELLATION_POLICY,
  computeCoolingOffExpiry,
} from "../../shared/cancellation.ts";
import { stayFacilitiesStatus, DEFAULT_FACILITIES_SETTINGS } from "../../shared/facilities.ts";
import { addDaysIso } from "../../shared/cancellation.ts";
import { bookingCancelToken } from "../../shared/contacts.ts";
import { appOrigin } from "../../shared/origin.ts";

const HOLD_MINUTES = 30;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      arrival_date, nights, guests, dog_count,
      name, email, phone, address, message,
      marketing_consent, facilities_acknowledged, cancellation_acknowledged,
      utm_source, utm_medium, utm_campaign, how_heard,
      pricing_fingerprint,
    } = body || {};

    // --- Validation (server-side, never trusts the browser) ---
    if (!arrival_date || !nights || !name || !email) {
      return Response.json({ error: "Name, email, arrival date and stay length are required." }, { status: 400 });
    }

    // Pricing config drift guard — refuse the booking unless the published
    // site's pricing fingerprint matches the server's, so a guest is never
    // charged a price that differs from what the site displayed. A missing
    // fingerprint is refused the same as a mismatched one.
    const serverFp = pricingFingerprint(PRICING_SETTINGS, SEASONS, BOOKING_RULES);
    if (pricing_fingerprint !== serverFp) {
      return Response.json(
        { error: "Pricing on this page is out of date. Please refresh and try again.", drift: true },
        { status: 200 }
      );
    }
    const arrival = new Date(arrival_date + "T00:00:00Z");
    if (isNaN(arrival.getTime())) return Response.json({ error: "Invalid arrival date." }, { status: 400 });
    const n = Number(nights);
    if (!Number.isInteger(n) || n < 1) return Response.json({ error: "Invalid stay length." }, { status: 400 });
    if (!seasonForDate(arrival)) return Response.json({ error: "Arrival date is outside the booking season." }, { status: 400 });
    const allowed = allowedLengthsForArrival(arrival);
    if (!allowed.includes(n)) return Response.json({ error: `A ${n}-night stay is not available on ${arrival_date}.` }, { status: 400 });
    const g = Number(guests) || 0;
    if (g < 1 || g > 6) return Response.json({ error: "Guests must be between 1 and 6." }, { status: 400 });
    const dogs = Math.max(0, Math.min(Number(dog_count) || 0, 2));

    // --- Recalculate the price from the pricing engine ---
    const breakdown = calculatePrice(arrival, n, dogs);
    if (!breakdown) return Response.json({ error: "Could not price this stay." }, { status: 400 });
    const payableInFull = isPayableInFullIso(arrival_date);
    const amountDue = payableInFull ? breakdown.total : breakdown.deposit;

    // --- Re-check availability before creating the session ---
    const available = await isAvailable(base44, arrival_date, n);
    if (!available) {
      return Response.json({ error: "Sorry, those dates were just taken. Please choose another arrival." }, { status: 409 });
    }

    // --- Facilities acknowledgement (if the stay is affected) ---
    const facRows = await base44.asServiceRole.entities.FacilitiesSettings.list();
    const settings = (facRows && facRows[0]) || DEFAULT_FACILITIES_SETTINGS;
    const facStatus = stayFacilitiesStatus(arrival_date, n, settings);
    if (facStatus.state !== "open" && !facilities_acknowledged) {
      return Response.json({ error: "Please acknowledge the facilities closure for these dates." }, { status: 400 });
    }

    // --- Policy snapshot + cooling-off ---
    const policyRows = await base44.asServiceRole.entities.CancellationPolicy.list();
    const policy = policyRows && policyRows.length ? normalizePolicy(policyRows[0]) : DEFAULT_CANCELLATION_POLICY;
    const policyText = buildPolicyText(policy);
    const coolingOffExpiryMs = computeCoolingOffExpiry(Date.now(), arrival_date, policy);

    // --- UTM / acquisition source ---
    const utm = [utm_source, utm_medium, utm_campaign].filter(Boolean).join("/");
    const acquisition_source = [how_heard, utm].filter(Boolean).join(" · ");

    // --- Create the booking as held (30-minute expiry) ---
    const departure = addDaysIso(arrival_date, n);
    const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60000).toISOString();
    const booking = await base44.asServiceRole.entities.Booking.create({
      guest_name: name,
      guest_email: email,
      arrival_date,
      departure_date: departure,
      nights: n,
      guests: g,
      dogs: dogs > 0,
      dog_count: dogs,
      status: "held",
      gross_revenue: breakdown.total,
      deposit_paid: 0,
      balance_paid: 0,
      source: acquisition_source || undefined,
      notes: message ? `${message}${phone ? ` · Phone: ${phone}` : ""}${address ? ` · Address: ${address}` : ""}` : undefined,
      facilities_acknowledged: !!facilities_acknowledged,
      facilities_acknowledged_at: !!facilities_acknowledged ? new Date().toISOString() : undefined,
      cancellation_policy_text: policyText,
      cooling_off_expires_at: new Date(coolingOffExpiryMs).toISOString(),
      hold_expires_at: holdExpiresAt,
      cancel_token: bookingCancelToken(),
    });

    // --- Create the Stripe Checkout Session ---
    let session;
    try {
      const origin = appOrigin(req);
      session = await stripeCreateSession({
        amountPence: toMinorUnits(amountDue),
        reference: booking.id,
        metadata: {
          booking_id: booking.id,
          arrival_date,
          nights: String(n),
          marketing_consent: marketing_consent ? "true" : "false",
        },
        successUrl: `${origin}/booking/return?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/booking/cancelled?session_id={CHECKOUT_SESSION_ID}`,
        email,
      });
    } catch (e) {
      // Clean up the held booking if the session could not be created.
      await base44.asServiceRole.entities.Booking.delete(booking.id).catch(() => {});
      return Response.json({ error: `Could not start checkout: ${e.message}` }, { status: 502 });
    }

    await base44.asServiceRole.entities.Booking.update(booking.id, {
      stripe_session_id: session.id,
    });

    return Response.json({
      ok: true,
      url: session.url,
      booking_id: booking.id,
      amount_due: amountDue,
      payable_in_full: payableInFull,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}