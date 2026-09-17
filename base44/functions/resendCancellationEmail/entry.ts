// Admin-only: resend the guest cancellation confirmation email for a booking
// whose confirmation failed to send at cancel time. Rebuilds the exact same
// template (same refund preview) used at cancellation, sends it, logs the
// attempt, and sets cancellation_email_sent on the booking. Never issues or
// alters a refund — the refund already happened.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { computeRefundPreview } from "../../shared/cancellationPreview.ts";
import { logEmailAttempt } from "../../shared/emailLog.ts";
import { appBaseUrl } from "../../shared/origin.ts";
import { buildGuestCancellationEmail } from "../../shared/bookingEmail.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin required" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const bookingId = body.booking_id;
    if (!bookingId) return Response.json({ error: "booking_id required" }, { status: 400 });

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status !== "cancelled") {
      return Response.json({ error: "Booking is not cancelled" }, { status: 400 });
    }
    if (!booking.guest_email) {
      return Response.json({ error: "Guest email address is missing on this booking" }, { status: 400 });
    }

    const preview = await computeRefundPreview(base44, booking);
    const base = appBaseUrl();
    const tpl = buildGuestCancellationEmail({ booking, preview, appBaseUrl: base });

    let ok = false, err = null;
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: booking.guest_email, subject: tpl.subject, text: tpl.text, html: tpl.html,
      });
      ok = true;
    } catch (e) {
      err = e?.message || String(e);
    }
    await logEmailAttempt(base44, {
      booking_id: booking.id, recipient: booking.guest_email,
      template: "cancellation_guest", subject: tpl.subject, ok, error: err,
    });
    if (ok) {
      try {
        await base44.asServiceRole.entities.Booking.update(booking.id, { cancellation_email_sent: true });
      } catch {}
    }
    return Response.json({ ok, error: err, subject: tpl.subject });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}