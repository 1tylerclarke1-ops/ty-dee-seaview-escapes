// Shared payment-confirmation logic used by BOTH the return-to-site handler
// (confirmPayment) and the webhook (stripeWebhook). Idempotent: a booking that
// is already deposit_paid/confirmed is not re-processed. Re-checks availability
// before confirming (the race-condition guard): if the dates were taken, the
// payment is refunded immediately, an apology email with alternatives is sent
// to the guest, and the owner is alerted.

import { toMinorUnits, fromMinorUnits } from "./money.ts";
import { createRefund, retrievePaymentFee } from "./stripe.ts";
import { calculatePrice, isPayableInFullIso } from "./pricing.ts";
import { findConflict, findAlternativeDates } from "./availability.ts";
import {
  normalizePolicy,
  DEFAULT_CANCELLATION_POLICY,
  computeCoolingOffExpiry,
} from "./cancellation.ts";
import { DEFAULT_FACILITIES_SETTINGS } from "./facilities.ts";
import { normalizeEmail } from "./contacts.ts";
import { logEmailAttempt } from "./emailLog.ts";
import { appBaseUrl } from "./origin.ts";
import {
  ownerEmail,
  buildGuestConfirmationEmail,
  buildOwnerAlertEmail,
} from "./bookingEmail.ts";

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

  // Race condition, pre-check: at confirm time only deposit_paid/confirmed
  // bookings block — NOT holds (see availability.ts). If a confirmed booking
  // already holds these dates, this payment lost the race.
  const conflict = await findConflict(base44, booking.arrival_date, booking.nights, booking.id, false);
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

  // ATOMIC CONFIRM — a conditional update: { stripe_session_id, status: "held" }
  // uniquely targets this booking (session id is unique) AND tests the status
  // in one atomic write. If the webhook and the return-to-site both fire, only
  // one flips the status; the other sees updated=0 and treats it as already
  // confirmed. This is the per-booking atomicity guarantee.
  const atomic = await base44.asServiceRole.entities.Booking.updateMany(
    { stripe_session_id: session.id, status: "held" },
    { $set: updateData }
  );
  if (!atomic || atomic.updated === 0) {
    // Another path already moved the status off "held" — idempotent skip.
    return { already_confirmed: true };
  }

  // Post-update tiebreaker: if two overlapping holds both confirmed in the
  // same instant (a createCheckoutSession race past the availability check),
  // the one created earlier wins. If we lost, refund ourselves; the winner's
  // own check finds no earlier-created overlap and keeps its confirmation.
  const overlap = await findConflict(base44, booking.arrival_date, booking.nights, booking.id, false);
  if (overlap) {
    const myCreated = booking.created_date ? new Date(booking.created_date).getTime() : 0;
    const theirCreated = overlap.created_date ? new Date(overlap.created_date).getTime() : 0;
    const iLost = theirCreated < myCreated || (theirCreated === myCreated && overlap.id < booking.id);
    if (iLost) {
      return await handleRaceLost(base44, { ...booking, ...updateData }, session);
    }
    // We won — the other booking's own post-update check will refund it.
  }

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
  const coolingOffIso = new Date(coolingOffExpiryMs).toISOString();

  const facRows = await base44.asServiceRole.entities.FacilitiesSettings.list();
  const settings = (facRows && facRows[0]) || DEFAULT_FACILITIES_SETTINGS;

  const { subject, text: body } = buildGuestConfirmationEmail({
    booking, breakdown, payableInFull, settings,
    coolingOffIso, appBaseUrl: appBaseUrl(),
  });

  // Guest confirmation — log the attempt, never block the confirmation.
  let guestOk = false;
  let guestError = null;
  if (booking.guest_email) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: booking.guest_email, subject, text: body,
      });
      guestOk = true;
    } catch (e) {
      guestError = e?.message || String(e);
    }
    await logEmailAttempt(base44, {
      booking_id: booking.id, recipient: booking.guest_email,
      template: "booking_confirmation_guest", subject, ok: guestOk, error: guestError,
    });
  }

  // Owner alert — logged separately.
  const owner = ownerEmail();
  const { subject: ownerSubject, text: ownerBody } = buildOwnerAlertEmail({
    booking, breakdown, payableInFull,
  });
  let ownerOk = false;
  let ownerError = null;
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: owner, subject: ownerSubject, text: ownerBody,
    });
    ownerOk = true;
  } catch (e) {
    ownerError = e?.message || String(e);
  }
  await logEmailAttempt(base44, {
    booking_id: booking.id, recipient: owner,
    template: "booking_confirmation_owner", subject: ownerSubject, ok: ownerOk, error: ownerError,
  });

  // Flag both emails so admin can see and resend if either failed.
  // Best-effort — never blocks.
  try {
    await base44.asServiceRole.entities.Booking.update(booking.id, {
      confirmation_email_sent: guestOk,
      owner_alert_sent: ownerOk,
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
    `Or browse all availability at ${appBaseUrl()}/prices — or reply to this email and we'll help directly.`,
    ``,
    `With apologies,`,
    `Ty Dee Seaview Escapes`,
  ].join("\n");
  const apologySubject = `Your booking — we're sorry, the dates were just taken`;
  let ok = false;
  let err = null;
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: booking.guest_email,
      subject: apologySubject,
      text: body,
    });
    ok = true;
  } catch (e) {
    err = e?.message || String(e);
  }
  await logEmailAttempt(base44, {
    booking_id: booking.id, recipient: booking.guest_email,
    template: "apology_race_lost", subject: apologySubject, ok, error: err,
  });
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
  let ok = false;
  let err = null;
  const owner = ownerEmail();
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: owner,
      subject: headline,
      text: body,
    });
    ok = true;
  } catch (e) {
    err = e?.message || String(e);
  }
  await logEmailAttempt(base44, {
    booking_id: booking.id, recipient: owner,
    template: "owner_alert", subject: headline, ok, error: err,
  });
}