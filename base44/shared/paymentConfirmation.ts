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
import { maybeSendArrivalInfoImmediate } from "./arrivalInfo.ts";

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
  // Accept either the deposit or the full amount — a guest who chose to pay
  // in full at booking (arrival >60 days away) pays the full total, not just
  // the deposit. The amount itself tells us which, so no flag is needed.
  const expectedFullPence = toMinorUnits(breakdown.total);
  const expectedDepositPence = toMinorUnits(breakdown.deposit);
  const isFullPayment = session.amount_total === expectedFullPence;
  const isDepositPayment = session.amount_total === expectedDepositPence;
  if (!isFullPayment && !isDepositPayment) {
    return { error: `Amount mismatch: expected ${expectedDepositPence} (deposit) or ${expectedFullPence} (full), got ${session.amount_total}` };
  }
  const paidInFull = isFullPayment;

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
    status: paidInFull ? "confirmed" : "deposit_paid",
    stripe_payment_intent_id: paymentIntentId,
    stripe_fee: stripeFee,
    hold_expires_at: null,
  };
  if (paidInFull) {
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
  await sendConfirmationEmails(base44, confirmedBooking, breakdown, paidInFull);

  // Arrival info — if paid in full and arriving within 3 days, send immediately
  // so a last-minute booking doesn't wait for the daily 09:00 job.
  if (paidInFull) {
    await maybeSendArrivalInfoImmediate(base44, confirmedBooking);
  }

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
  // Owner no longer emailed per-event — the cancelled booking (with its
  // auto-refund note) is visible in the admin dashboard, and the daily digest
  // surfaces new bookings. Keeps owner email to one digest/day.
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

async function sendConfirmationEmails(base44, booking, breakdown, paidInFull) {
  const policyRows = await base44.asServiceRole.entities.CancellationPolicy.list();
  const policy = policyRows && policyRows.length ? normalizePolicy(policyRows[0]) : DEFAULT_CANCELLATION_POLICY;
  const bookedAtMs = booking.created_date ? new Date(booking.created_date).getTime() : Date.now();
  const coolingOffExpiryMs = booking.cooling_off_expires_at
    ? new Date(booking.cooling_off_expires_at).getTime()
    : computeCoolingOffExpiry(bookedAtMs, booking.arrival_date, policy);
  const coolingOffIso = new Date(coolingOffExpiryMs).toISOString();

  const facRows = await base44.asServiceRole.entities.FacilitiesSettings.list();
  const settings = (facRows && facRows[0]) || DEFAULT_FACILITIES_SETTINGS;

  const { subject, text: body, html: guestHtml } = buildGuestConfirmationEmail({
    booking, breakdown, paidInFull, settings,
    coolingOffIso, appBaseUrl: appBaseUrl(),
  });

  // Guest confirmation — log the attempt, never block the confirmation.
  let guestOk = false;
  let guestError = null;
  if (booking.guest_email) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: booking.guest_email, subject, text: body, html: guestHtml,
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

  // Flag the guest email so admin can see and resend if it failed.
  // Best-effort — never blocks.
  try {
    await base44.asServiceRole.entities.Booking.update(booking.id, {
      confirmation_email_sent: guestOk,
    });
  } catch {}

  // Imminent arrivals get an immediate owner email — a booking for a stay
  // starting within 7 days can't wait for the daily digest (it could arrive
  // after the guest). These are rare, so the per-recipient cap is not a risk.
  // The booking is marked alerted on success so the daily digest skips it
  // (no double-tell); a failed imminent alert stays unmarked and the digest
  // retries it.
  if (arrivalWithinDays(booking.arrival_date, 7)) {
    await sendImminentOwnerAlert(base44, booking, breakdown, paidInFull);
  }
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

// True when the stay arrives within `days` days from today (UTC, same-day
// inclusive). Used to decide whether the owner needs a same-day alert rather
// than waiting for the daily digest.
function arrivalWithinDays(arrivalIso, days) {
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const a = new Date(arrivalIso + "T00:00:00Z").getTime();
  const diffDays = (a - todayUtc) / 86400000;
  return diffDays >= 0 && diffDays <= days;
}

// Immediate owner alert for an imminent arrival (within 7 days). Logged as
// "owner_alert_imminent" so it's distinguishable from the daily digest in the
// email log. On success, marks the booking alerted so the digest skips it.
async function sendImminentOwnerAlert(base44, booking, breakdown, paidInFull) {
  const { subject, text } = buildOwnerAlertEmail({ booking, breakdown, paidInFull });
  const owner = ownerEmail();
  let ok = false;
  let err = null;
  if (!owner) {
    err = "OWNER_EMAIL secret is not configured";
  } else {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: owner, subject, text,
      });
      ok = true;
    } catch (e) {
      err = e?.message || String(e);
    }
  }
  await logEmailAttempt(base44, {
    booking_id: booking.id, recipient: owner || "(unset)",
    template: "owner_alert_imminent", subject, ok, error: err,
  });
  if (ok) {
    try {
      await base44.asServiceRole.entities.Booking.update(booking.id, {
        owner_alert_sent: true,
      });
    } catch {}
  }
}