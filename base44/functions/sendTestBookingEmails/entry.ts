// Admin-only "send test emails" — renders the REAL production email templates
// for a synthetic booking built from the live pricing engine, and sends them
// to an address the admin enters. `which` selects the email(s):
//   "booking"   (default) — guest confirmation + owner digest (2 emails)
//   "post_stay"           — post-stay thank-you + review request (1 email)
//   "consent"             — marketing-consent ask, using a synthetic contact
//                          with an unsubscribe_token (1 email)
// Nothing persists except EmailLog rows marked as tests: no Booking, Contact,
// Review, or consent record is created, no dates are blocked, no counter/pitch-
// fee is touched. Every subject is prefixed [TEST] so it can never be mistaken
// for a real email. The UI warns about the per-recipient daily email cap.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { calculatePrice, isPayableInFullIso, balanceDueIso } from "../../shared/pricing.ts";
import { allowedLengthsForArrival, seasonForDate } from "../../shared/bookingRules.ts";
import {
  normalizePolicy,
  DEFAULT_CANCELLATION_POLICY,
  computeCoolingOffExpiry,
} from "../../shared/cancellation.ts";
import { DEFAULT_FACILITIES_SETTINGS } from "../../shared/facilities.ts";
import { bookingCancelToken, randomToken } from "../../shared/contacts.ts";
import { formatBookingReference } from "../../shared/bookingReference.ts";
import { logEmailAttempt } from "../../shared/emailLog.ts";
import { appBaseUrl } from "../../shared/origin.ts";
import {
  buildGuestConfirmationEmail,
  buildOwnerDigestEmail,
  buildPostStayEmail,
  buildConsentEmail,
} from "../../shared/bookingEmail.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const which = String(body.which || "booking");
    const arrival_date = String(body.arrival_date || "").trim();
    const nights = Number(body.nights);
    const recipient = String(body.recipient_email || "").trim().toLowerCase();
    const guest_name = String(body.guest_name || "Test Guest").trim() || "Test Guest";
    const guests = Number(body.guests) || 2;
    const dog_count = Number(body.dog_count) || 0;

    if (!arrival_date) return Response.json({ error: "Arrival date is required" }, { status: 400 });
    if (!nights || nights < 1) return Response.json({ error: "Nights must be a positive number" }, { status: 400 });
    if (!recipient || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
      return Response.json({ error: "A valid recipient email is required" }, { status: 400 });
    }

    // Enforce the real booking rules — refuse an invalid arrival/length
    // combination so a test email never renders a stay that could never be booked.
    const arrivalDate = new Date(arrival_date + "T00:00:00Z");
    if (!seasonForDate(arrivalDate)) {
      return Response.json({ error: "Arrival date is outside the booking season." }, { status: 400 });
    }
    const allowed = allowedLengthsForArrival(arrivalDate);
    if (!allowed.length) {
      return Response.json({ error: `No stays are available arriving on ${arrival_date}.` }, { status: 400 });
    }
    if (!allowed.includes(nights)) {
      return Response.json({
        error: `A ${nights}-night stay is not available on ${arrival_date}. Allowed: ${allowed.join(", ")} night${allowed.length === 1 ? "" : "s"}.`,
      }, { status: 400 });
    }

    const breakdown = calculatePrice(arrivalDate, nights, dog_count);
    if (!breakdown) {
      return Response.json({ error: "Could not price that stay — check the arrival date is within the booking season" }, { status: 400 });
    }

    const payableInFull = isPayableInFullIso(arrival_date);

    // Real cancellation policy + facilities settings (cooling-off + facilities note).
    const policyRows = await base44.asServiceRole.entities.CancellationPolicy.list();
    const policy = policyRows && policyRows.length ? normalizePolicy(policyRows[0]) : DEFAULT_CANCELLATION_POLICY;
    const facRows = await base44.asServiceRole.entities.FacilitiesSettings.list();
    const settings = (facRows && facRows[0]) || DEFAULT_FACILITIES_SETTINGS;

    const now = new Date();
    const coolingOffExpiryMs = computeCoolingOffExpiry(now.getTime(), arrival_date, policy);
    const coolingOffIso = new Date(coolingOffExpiryMs).toISOString();

    // Synthetic booking — NOT persisted. Shaped exactly like a real confirmed
    // booking so the shared template functions render it as a guest would see.
    const departureDate = new Date(arrivalDate.getTime() + nights * 86400000).toISOString().slice(0, 10);
    const booking = {
      id: "TEST-" + now.getTime(),
      reference: formatBookingReference(now),
      guest_name,
      guest_email: recipient,
      arrival_date,
      departure_date: departureDate,
      nights,
      guests,
      dogs: dog_count > 0,
      dog_count,
      status: payableInFull ? "confirmed" : "deposit_paid",
      deposit_paid: breakdown.deposit,
      balance_paid: payableInFull ? breakdown.balance : 0,
      gross_revenue: breakdown.total,
      created_date: now.toISOString(),
      cooling_off_expires_at: coolingOffIso,
      facilities_acknowledged: true,
      cancel_token: bookingCancelToken(),
    };

    const base = appBaseUrl();
    const breakdownOut = {
      seasonName: breakdown.season ? (breakdown.season.name || null) : null,
      total: breakdown.total,
      deposit: breakdown.deposit,
      balance: breakdown.balance,
      payableInFull,
      balanceDue: balanceDueIso(arrival_date),
    };

    if (which === "post_stay") {
      const built = buildPostStayEmail({ booking, appBaseUrl: base });
      const subject = `[TEST] ${built.subject}`;
      let ok = false, err = null;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({ to: recipient, subject, text: built.text, html: built.html });
        ok = true;
      } catch (e) { err = e?.message || String(e); }
      await logEmailAttempt(base44, { booking_id: null, recipient, template: "test_post_stay", subject, ok, error: err });
      const logs = await recentTestLogs(base44, recipient, ["test_post_stay"]);
      return Response.json({ ok: true, post_stay: { ok, error: err, subject }, breakdown: breakdownOut, logs });
    }

    if (which === "consent") {
      // Synthetic contact — NOT persisted. Needs an unsubscribe_token for the
      // /consent link, exactly like a real contact would have.
      const contact = {
        email: recipient,
        name: guest_name,
        unsubscribe_token: randomToken(),
        marketing_consent: false,
        unsubscribed: false,
      };
      const built = buildConsentEmail({ booking, contact, appBaseUrl: base });
      const subject = `[TEST] ${built.subject}`;
      let ok = false, err = null;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({ to: recipient, subject, text: built.text, html: built.html });
        ok = true;
      } catch (e) { err = e?.message || String(e); }
      await logEmailAttempt(base44, { booking_id: null, recipient, template: "test_consent", subject, ok, error: err });
      const logs = await recentTestLogs(base44, recipient, ["test_consent"]);
      return Response.json({ ok: true, consent: { ok, error: err, subject }, breakdown: breakdownOut, logs });
    }

    // Default: "booking" — guest confirmation + owner digest.
    const guest = buildGuestConfirmationEmail({ booking, breakdown, payableInFull, settings, coolingOffIso, appBaseUrl: base });
    const guestSubject = `[TEST] ${guest.subject}`;
    const owner = buildOwnerDigestEmail({ bookings: [booking], enquiries: [], appBaseUrl: base });
    const ownerSubject = `[TEST] ${owner.subject}`;

    let guestOk = false, guestError = null;
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({ to: recipient, subject: guestSubject, text: guest.text, html: guest.html });
      guestOk = true;
    } catch (e) { guestError = e?.message || String(e); }

    let ownerOk = false, ownerError = null;
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({ to: recipient, subject: ownerSubject, text: owner.text, html: owner.html });
      ownerOk = true;
    } catch (e) { ownerError = e?.message || String(e); }

    await logEmailAttempt(base44, { booking_id: null, recipient, template: "test_booking_confirmation_guest", subject: guestSubject, ok: guestOk, error: guestError });
    await logEmailAttempt(base44, { booking_id: null, recipient, template: "test_owner_digest", subject: ownerSubject, ok: ownerOk, error: ownerError });

    const logs = await recentTestLogs(base44, recipient, ["test_booking_confirmation_guest", "test_owner_digest"]);

    return Response.json({
      ok: true,
      guest: { ok: guestOk, error: guestError, subject: guestSubject },
      owner: { ok: ownerOk, error: ownerError, subject: ownerSubject },
      breakdown: breakdownOut,
      logs,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function recentTestLogs(base44, recipient, templates) {
  try {
    return await base44.asServiceRole.entities.EmailLog.filter(
      { recipient, template: { $in: templates } },
      "-sent_at", 5
    ) || [];
  } catch {
    return [];
  }
}