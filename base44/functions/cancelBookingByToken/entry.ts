// Public: cancel a booking using its long single-use manage/cancel token.
// confirm=false (default) returns the refund preview — cooling-off status,
// tier, days remaining, total paid, refund due, amount retained — with no
// side effects, so the guest reviews exactly what they'll get back before
// committing. confirm=true issues the real Stripe refund (using the existing
// tier + cooling-off logic), sets the booking to cancelled (which releases
// the dates — availability only blocks deposit_paid/confirmed), emails both
// the guest and the owner, and invalidates the token. Never refunds silently;
// never accepts a refund amount from the client.
//
// Security: resolved by TOKEN ONLY (never booking id/email). Every
// non-cancellable case (no match, cancelled, completed, not-yet-paid) returns
// the SAME generic message — no response confirms a token existed.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { addDaysIso, todayIso } from "../../shared/cancellation.ts";
import { createRefund } from "../../shared/stripe.ts";
import { toMinorUnits } from "../../shared/money.ts";
import { computeRefundPreview } from "../../shared/cancellationPreview.ts";
import { logEmailAttempt } from "../../shared/emailLog.ts";
import { appBaseUrl } from "../../shared/origin.ts";
import { rateLimit } from "../../shared/rateLimit.ts";
import {
  ownerEmail,
  buildGuestCancellationEmail,
  buildOwnerCancellationAlert,
} from "../../shared/bookingEmail.ts";

// The single generic response for every non-cancellable case. Identical for
// an invalid token, an expired token, a cancelled booking, a completed stay,
// and a not-yet-paid booking — so no caller can learn whether a token existed.
const GENERIC_404 = { error: "This booking can no longer be cancelled online." };

export default async function (req) {
  // Rate limit first. 10 cancel attempts/min per IP — a legit guest makes two
  // (preview + confirm); this caps guessing without blocking real use.
  if (!rateLimit(req, "cancelBookingByToken", 10, 60_000)) {
    return Response.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429 });
  }
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    const confirm = body.confirm === true;

    // Resolve by TOKEN ONLY. No booking id or email is ever queried.
    const found = token
      ? await base44.asServiceRole.entities.Booking.filter({ cancel_token: token })
      : [];
    const booking = found && found[0];

    // Every non-cancellable case → same generic 404.
    if (!booking) return Response.json(GENERIC_404, { status: 404 });
    if (booking.status === "cancelled") return Response.json(GENERIC_404, { status: 404 });
    const departureIso = addDaysIso(booking.arrival_date, booking.nights);
    if (departureIso <= todayIso()) return Response.json(GENERIC_404, { status: 404 });
    if (booking.status !== "deposit_paid" && booking.status !== "confirmed") {
      return Response.json(GENERIC_404, { status: 404 });
    }

    const preview = await computeRefundPreview(base44, booking);

    if (!confirm) {
      return Response.json({ ok: true, confirm: false, ...preview });
    }

    // --- Confirm: issue the real Stripe refund ---
    const refundDue = preview.refund_due;
    let refundPaid = 0;
    let refundId = null;
    if (refundDue > 0 && booking.stripe_payment_intent_id) {
      try {
        const refund = await createRefund({
          paymentIntentId: booking.stripe_payment_intent_id,
          amountPence: toMinorUnits(refundDue),
        });
        refundPaid = typeof refund.amount === "number" ? refund.amount / 100 : 0;
        refundId = refund.id || null;
      } catch (e) {
        return Response.json({ ok: false, error: `Refund failed: ${e.message}` }, { status: 502 });
      }
    }

    // --- Cancel the booking + invalidate the token ---
    const updateData = {
      status: "cancelled",
      refund_due: refundDue,
      refund_paid: refundPaid,
      refund_date: todayIso(),
      refund_tier: preview.refund_tier,
      deposit_retained: preview.retained,
      cancel_token: null,
    };
    if (!booking.cooling_off_expires_at && preview.cooling_off_expires_at) {
      updateData.cooling_off_expires_at = preview.cooling_off_expires_at;
    }
    await base44.asServiceRole.entities.Booking.update(booking.id, updateData);
    const cancelledBooking = { ...booking, ...updateData };

    // --- Email both the guest and the owner ---
    const base = appBaseUrl();
    const guestTpl = buildGuestCancellationEmail({ booking: cancelledBooking, preview, appBaseUrl: base });
    let guestOk = false, guestErr = null;
    if (cancelledBooking.guest_email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: cancelledBooking.guest_email, subject: guestTpl.subject,
          text: guestTpl.text, html: guestTpl.html,
        });
        guestOk = true;
      } catch (e) { guestErr = e?.message || String(e); }
      await logEmailAttempt(base44, {
        booking_id: booking.id, recipient: cancelledBooking.guest_email,
        template: "cancellation_guest", subject: guestTpl.subject, ok: guestOk, error: guestErr,
      });
    }

    const ownerTpl = buildOwnerCancellationAlert({ booking: cancelledBooking, preview });
    const owner = ownerEmail();
    let ownerOk = false, ownerErr = null;
    if (owner) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: owner, subject: ownerTpl.subject, text: ownerTpl.text,
        });
        ownerOk = true;
      } catch (e) { ownerErr = e?.message || String(e); }
      await logEmailAttempt(base44, {
        booking_id: booking.id, recipient: owner,
        template: "cancellation_owner", subject: ownerTpl.subject, ok: ownerOk, error: ownerErr,
      });
    }

    // Persist the cancellation-email flag so the admin dashboard can surface a
    // loud "cancellation confirmation not sent" alert if this send failed.
    // Best-effort — the booking is already cancelled and refunded regardless.
    try {
      await base44.asServiceRole.entities.Booking.update(booking.id, {
        cancellation_email_sent: guestOk,
      });
    } catch {}

    return Response.json({
      ok: true,
      confirm: true,
      refund_id: refundId,
      refund_paid: refundPaid,
      refund_due: refundDue,
      retained: preview.retained,
      refund_percent: preview.refund_percent,
      refund_tier: preview.refund_tier,
      guest_email_ok: guestOk,
      owner_email_ok: ownerOk,
      guest_email_error: guestErr,
      owner_email_error: ownerErr,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}