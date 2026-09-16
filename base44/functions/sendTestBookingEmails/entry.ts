// Admin-only "send test emails" — renders the REAL guest confirmation and the
// REAL owner digest for a synthetic booking built from the live pricing
// engine, and sends both to an address the admin enters. Nothing persists
// except two EmailLog rows marked as tests: no Booking record is created, no
// dates are blocked, no counter/pitch-fee is touched. Both subjects are
// prefixed [TEST] so they can never be mistaken for a real booking. The owner
// email is sent immediately (not waiting for the 09:00 digest). The UI warns
// that this consumes ~2 of the per-recipient daily email cap (~3-4).
import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { calculatePrice, isPayableInFullIso, balanceDueIso } from "../../shared/pricing.ts";
import { allowedLengthsForArrival, seasonForDate } from "../../shared/bookingRules.ts";
import {
  normalizePolicy,
  DEFAULT_CANCELLATION_POLICY,
  computeCoolingOffExpiry,
} from "../../shared/cancellation.ts";
import { DEFAULT_FACILITIES_SETTINGS } from "../../shared/facilities.ts";
import { bookingCancelToken } from "../../shared/contacts.ts";
import { logEmailAttempt } from "../../shared/emailLog.ts";
import { appBaseUrl } from "../../shared/origin.ts";
import { buildGuestConfirmationEmail, buildOwnerDigestEmail } from "../../shared/bookingEmail.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
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
    // combination (e.g. a Monday arrival only allows 4 nights or multiples of
    // 7), so a test email never renders a stay that could never be booked.
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

    // Real guest confirmation template.
    const guest = buildGuestConfirmationEmail({
      booking, breakdown, payableInFull, settings,
      coolingOffIso, appBaseUrl: appBaseUrl(),
    });
    const guestSubject = `[TEST] ${guest.subject}`;

    // Real owner digest template — with just this one booking.
    const owner = buildOwnerDigestEmail({
      bookings: [booking],
      enquiries: [],
      appBaseUrl: appBaseUrl(),
    });
    const ownerSubject = `[TEST] ${owner.subject}`;

    // Send both to the entered address (immediately — no digest wait).
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

    // The only thing that persists: two EmailLog rows marked as tests.
    await logEmailAttempt(base44, {
      booking_id: null, recipient,
      template: "test_booking_confirmation_guest",
      subject: guestSubject, ok: guestOk, error: guestError,
    });
    await logEmailAttempt(base44, {
      booking_id: null, recipient,
      template: "test_owner_digest",
      subject: ownerSubject, ok: ownerOk, error: ownerError,
    });

    // Return the actual EmailLog rows so the admin sees the audit trail.
    let logs = [];
    try {
      logs = await base44.asServiceRole.entities.EmailLog.filter(
        { recipient, template: { $in: ["test_booking_confirmation_guest", "test_owner_digest"] } },
        "-sent_at", 5
      );
    } catch {}

    return Response.json({
      ok: true,
      guest: { ok: guestOk, error: guestError, subject: guestSubject },
      owner: { ok: ownerOk, error: ownerError, subject: ownerSubject },
      breakdown: {
        seasonName: breakdown.season ? (breakdown.season.name || null) : null,
        total: breakdown.total,
        deposit: breakdown.deposit,
        balance: breakdown.balance,
        payableInFull,
        balanceDue: balanceDueIso(arrival_date),
      },
      logs: logs || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}