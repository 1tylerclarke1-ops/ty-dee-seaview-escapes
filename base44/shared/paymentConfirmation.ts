// Shared payment-confirmation logic used by BOTH the return-to-site handler
// (confirmPayment) and the webhook (stripeWebhook). Idempotent: a booking that
// is already deposit_paid/confirmed is not re-processed. Re-checks availability
// before confirming (the race-condition guard): if the dates were taken, the
// payment is refunded immediately, an apology email with alternatives is sent
// to the guest, and the owner is alerted.

import { toMinorUnits, fromMinorUnits } from "./money.ts";
import { createRefund, retrievePaymentFee } from "./stripe.ts";
import { calculatePrice, isPayableInFullIso, balanceDueIso } from "./pricing.ts";
import { findConflict, findAlternativeDates } from "./availability.ts";
import {
  normalizePolicy,
  buildPolicyText,
  DEFAULT_CANCELLATION_POLICY,
  computeCoolingOffExpiry,
  formatCoolingOffExpiry,
} from "./cancellation.ts";
import {
  stayFacilitiesStatus,
  DEFAULT_FACILITIES_SETTINGS,
} from "./facilities.ts";
import { normalizeEmail } from "./contacts.ts";

const OWNER_EMAIL = "stay@tydee.co.uk";
const APP_ORIGIN = "https://ty-dee-stays.base44.app";

// Confirm a booking's payment from a verified Stripe Checkout Session.
// `session` is the Stripe session object (already retrieved + verified by the
// caller for payment_status/currency/amount where applicable, but this also
// re-verifies). Returns one of:
//   { already_confirmed: true } — idempotent skip
//   { confirmed: true, status } — newly confirmed
//   { race_lost: true, refundError? } — dates taken, refunded + emailed
//   { error } — verification failed
export async function confirmBookingPayment(base44, booking, session) {
  // Idempotency — already confirmed by the other path.
  if (booking.status === "deposit_paid" || booking.status === "confirmed") {
    return { already_confirmed: true };
  }

  // Verify the session server-side — never trust the browser.
  if (!session || session.payment_status !== "paid") {
    return { error: "Session is not paid" };
  }
  if ((session.currency || "").toLowerCase() !== "gbp") {
    return { error: "Currency is not GBP" };
  }

  // Recalculate the expected amount from the pricing engine.
  const arrivalDate = new Date(booking.arrival_date + "T00:00:00Z");
  const breakdown = calculatePrice(arrivalDate, booking.nights, booking.dog_count || 0);
  if (!breakdown) return { error: "Could not price the stay" };
  const payableInFull = isPayableInFullIso(booking.arrival_date);
  const expectedPence = toMinorUnits(payableInFull ? breakdown.total : breakdown.deposit);
  if (session.amount_total !== expectedPence) {
    return { error: `Amount mismatch: expected ${expectedPence}, got ${session.amount_total}` };
  }

  // Race condition: re-check availability before confirming.
  const conflict = await findConflict(base44, booking.arrival_date, booking.nights, booking.id);
  if (conflict) {
    return await handleRaceLost(base44, booking, session);
  }

  // Confirm the booking.
  const paymentIntentId = session.payment_intent;
  let stripeFee = 0;
  if (paymentIntentId) {
    try { stripeFee = await retrievePaymentFee(paymentIntentId) || 0; } catch {}
  }
  const amountPaid = fromMinorUnits(session.amount_total);
  const updateData = {
    status: payableInFull ? "confirmed" : "deposit_paid",
    stripe_payment_intent_id: paymentIntentId,
    stripe_fee: stripeFee,
    hold_expires_at: null,
  };
  if (payableInFull) {
    updateData.deposit_paid = breakdown.deposit;
    updateData.balance_paid = breakdown.balance;
  } else {
    updateData.deposit_paid = amountPaid;
    updateData.balance_paid = 0;
  }
  await base44.asServiceRole.entities.Booking.update(booking.id, updateData);
  const confirmedBooking = { ...booking, ...updateData };

  // Capture the contact + marketing consent (best-effort, never blocks).
  await upsertContact(base44, confirmedBooking, session);

  // Send confirmation emails to guest and owner.
  await sendConfirmationEmails(base44, confirmedBooking, breakdown, payableInFull);

  return { confirmed: true, status: updateData.status };
}

async function handleRaceLost(base44, booking, session) {
  const paymentIntentId = session.payment_intent;
  const refundPence = session.amount_total;
  let refundResult = null;
  let refundError = null;
  if (paymentIntentId) {
    try {
      refundResult = await createRefund({ paymentIntentId, amountPence: refundPence });
    } catch (e) {
      refundError = e.message;
    }
  }
  const refundPaid = refundResult && typeof refundResult.amount === "number"
    ? fromMinorUnits(refundResult.amount) : 0;
  await base44.asServiceRole.entities.Booking.update(booking.id, {
    status: "cancelled",
    refund_due: fromMinorUnits(refundPence),
    refund_paid: refundPaid,
    refund_date: new Date().toISOString().slice(0, 10),
    refund_tier: "dates taken — auto refund",
    notes: (booking.notes || "") + "\n\nAuto-cancelled: the dates were taken by another guest during payment. Refund issued.",
  });

  const alternatives = await findAlternativeDates(base44, booking.arrival_date, booking.nights, 3);
  await sendApologyEmail(base44, booking, alternatives);
  await sendOwnerAlert(base44, booking, "Dates taken during payment — auto-refunded", refundError);
  return { race_lost: true, refundError };
}

async function upsertContact(base44, booking, session) {
  const email = normalizeEmail(booking.guest_email);
  if (!email) return;
  try {
    const existing = await base44.asServiceRole.entities.Contact.filter({ email });
    const ex = existing && existing[0];
    const consent = session.metadata && session.metadata.marketing_consent === "true";
    const month = new Date(booking.arrival_date + "T00:00:00Z").getUTCMonth() + 1;
    const data = {
      name: booking.guest_name || ex?.name || "",
      email,
      phone: ex?.phone || "",
      source: ex?.source === "past_guest" ? "past_guest" : "website",
      party_size_typical: booking.guests || ex?.party_size_typical || null,
      has_dog: !!(booking.dog_count) || !!(ex?.has_dog),
      dog_count: Math.max(booking.dog_count || 0, ex?.dog_count || 0),
      first_seen: ex?.first_seen || new Date().toISOString().slice(0, 10),
    };
    data.months_stayed = ex?.months_stayed
      ? [...new Set([...ex.months_stayed, month])]
      : [month];
    if (consent) {
      data.marketing_consent = true;
      data.consent_date = new Date().toISOString();
      data.consent_source = "checkout_payment";
    }
    if (ex) {
      await base44.asServiceRole.entities.Contact.update(ex.id, data);
    } else {
      await base44.asServiceRole.entities.Contact.create({
        ...data,
        marketing_consent: data.marketing_consent || false,
        unsubscribed: false,
      });
    }
  } catch {}
}

async function sendConfirmationEmails(base44, booking, breakdown, payableInFull) {
  const policyRows = await base44.asServiceRole.entities.CancellationPolicy.list();
  const policy = policyRows && policyRows.length ? normalizePolicy(policyRows[0]) : DEFAULT_CANCELLATION_POLICY;
  const bookedAtMs = booking.created_date ? new Date(booking.created_date).getTime() : Date.now();
  const coolingOffExpiryMs = booking.cooling_off_expires_at
    ? new Date(booking.cooling_off_expires_at).getTime()
    : computeCoolingOffExpiry(bookedAtMs, booking.arrival_date, policy);
  const coolingOffDisplay = formatCoolingOffExpiry(coolingOffExpiryMs);

  const facRows = await base44.asServiceRole.entities.FacilitiesSettings.list();
  const settings = (facRows && facRows[0]) || DEFAULT_FACILITIES_SETTINGS;
  const facStatus = stayFacilitiesStatus(booking.arrival_date, booking.nights, settings);

  const amountPaid = payableInFull ? breakdown.total : breakdown.deposit;
  const subject = `Your stay at Ty Dee Seaview Escapes is confirmed — arriving ${booking.arrival_date}`;
  const lines = [
    `Hello ${booking.guest_name || ""},`,
    ``,
    `Your booking is confirmed and your payment of £${amountPaid.toFixed(2)} has been received.`,
    ``,
    `Arriving ${booking.arrival_date}, ${booking.nights} night(s), ${booking.guests || ""} guest(s).`,
    ``,
    payableInFull
      ? `You've paid the full balance — there's nothing further to pay.`
      : `You've paid your deposit. The balance of £${breakdown.balance.toFixed(2)} is due by ${balanceDueIso(booking.arrival_date)} — we'll be in touch nearer the time.`,
    ``,
    `Change your mind? You have a full refund until ${coolingOffDisplay} — cancel before then and everything you've paid comes back.`,
  ];
  if (facStatus.state !== "open") {
    lines.push(``);
    lines.push(settings.facilities_winter_note || `The park's on-site facilities are closed for these dates. Your booking is for the accommodation only.`);
  }
  lines.push(``);
  lines.push(booking.cancellation_policy_text || buildPolicyText(policy));
  lines.push(``);
  lines.push(`Ty Dee Seaview Escapes — Polperro, Cornwall`);
  const body = lines.join("\n");

  if (booking.guest_email) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: booking.guest_email, subject, text: body,
      });
    } catch {}
  }
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: OWNER_EMAIL,
      subject: `New booking confirmed & paid — ${booking.guest_name}`,
      text: `${booking.guest_name} (${booking.guest_email || "no email"}) booked ${booking.arrival_date} for ${booking.nights} night(s), ${booking.guests} guest(s). Paid £${amountPaid.toFixed(2)}${payableInFull ? " (full)" : " (deposit)"}. Booking ref ${booking.id}.`,
    });
  } catch {}
}

async function sendApologyEmail(base44, booking, alternatives) {
  if (!booking.guest_email) return;
  const altText = alternatives.length
    ? alternatives.map((d) => `  • ${d}`).join("\n")
    : "We'll help you find new dates — just reply to this email.";
  const body = [
    `Hello ${booking.guest_name || ""},`,
    ``,
    `We're very sorry — the dates you booked (${booking.arrival_date}, ${booking.nights} nights) were taken by another guest moments before your payment completed. This is a rare race condition and we apologise for the disappointment.`,
    ``,
    `Your card has been refunded in full. The refund should appear on your statement within 5–10 working days.`,
    ``,
    `If you'd still like to stay with us, here are the next available dates for a ${booking.nights}-night stay:`,
    altText,
    ``,
    `Or browse all availability at ${APP_ORIGIN}/prices — or reply to this email and we'll help directly.`,
    ``,
    `With apologies,`,
    `Ty Dee Seaview Escapes`,
  ].join("\n");
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: booking.guest_email,
      subject: `Your booking — we're sorry, the dates were just taken`,
      text: body,
    });
  } catch {}
}

async function sendOwnerAlert(base44, booking, headline, extra) {
  const body = [
    headline,
    ``,
    `Guest: ${booking.guest_name} (${booking.guest_email || "no email"})`,
    `Dates: ${booking.arrival_date} for ${booking.nights} night(s)`,
    `Booking ref: ${booking.id}`,
    extra ? `Note: ${extra}` : "",
  ].filter(Boolean).join("\n");
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: OWNER_EMAIL,
      subject: headline,
      text: body,
    });
  } catch {}
}