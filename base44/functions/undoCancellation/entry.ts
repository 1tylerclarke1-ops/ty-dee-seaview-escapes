// Admin-only: undo an automatic cancellation for non-payment. Restores the
// booking to deposit_paid, re-blocks the dates, and emails the guest a fresh
// payment link. Refuses (with a reason) if the dates have been taken since
// the cancellation, or if the 24-hour undo window has passed.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { findConflict } from "../../shared/availability.ts";
import { todayIso } from "../../shared/cancellation.ts";
import { logEmailAttempt } from "../../shared/emailLog.ts";
import { appBaseUrl } from "../../shared/origin.ts";
import { buildBookingRestoredEmail } from "../../shared/bookingEmail.ts";

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
    if (booking.status !== "cancelled" || booking.cancellation_reason !== "unpaid_balance") {
      return Response.json({ error: "This booking cannot be undone" }, { status: 400 });
    }

    // 24-hour undo window
    const autoCancelledMs = booking.auto_cancelled_at
      ? new Date(booking.auto_cancelled_at).getTime() : 0;
    if (!autoCancelledMs || Date.now() - autoCancelledMs > 86_400_000) {
      return Response.json({ error: "The 24-hour undo window has passed" }, { status: 400 });
    }

    // Refuse if the dates have been taken since the cancellation
    const conflict = await findConflict(base44, booking.arrival_date, booking.nights, booking.id, false);
    if (conflict) {
      const ref = conflict.reference || "";
      return Response.json({
        error: `The dates have been taken since the cancellation${ref ? ` (booking ${ref})` : ""}. The booking cannot be restored.`,
      }, { status: 409 });
    }

    // Grace period: 7 days from now, or until arrival if that is sooner.
    // During the grace period the normal day-52 auto-cancel is suppressed and
    // a separate reminder schedule (halfway + day-before) runs instead.
    const today = todayIso();
    const sevenDaysDate = new Date(today + "T00:00:00Z");
    sevenDaysDate.setUTCDate(sevenDaysDate.getUTCDate() + 7);
    const sevenDaysIso = sevenDaysDate.toISOString().slice(0, 10);
    const graceDeadline = sevenDaysIso < booking.arrival_date ? sevenDaysIso : booking.arrival_date;

    // Restore the booking
    await base44.asServiceRole.entities.Booking.update(booking.id, {
      status: "deposit_paid",
      cancellation_reason: null,
      auto_cancelled_at: null,
      deposit_retained: 0,
      refund_due: 0,
      refund_tier: null,
      balance_overdue_flagged: false,
      cancellation_email_sent: false,
      grace_period_deadline: graceDeadline,
      grace_period_started_at: new Date().toISOString(),
      grace_period_reminders_sent: [],
    });

    // Email the guest a fresh payment link (best-effort)
    const restored = { ...booking, status: "deposit_paid", grace_period_deadline: graceDeadline };
    if (restored.guest_email && restored.cancel_token) {
      const balanceOwed = Math.max(
        Number(restored.gross_revenue || 0) - Number(restored.deposit_paid || 0) - Number(restored.balance_paid || 0), 0
      );
      const tpl = buildBookingRestoredEmail({
        booking: restored,
        balanceOwed,
        graceDeadline,
        appBaseUrl: appBaseUrl(),
      });
      let ok = false, err = null;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: restored.guest_email, subject: tpl.subject, text: tpl.text, html: tpl.html,
        });
        ok = true;
      } catch (e) { err = e?.message || String(e); }
      await logEmailAttempt(base44, {
        booking_id: booking.id, recipient: restored.guest_email,
        template: "undo_cancellation", subject: tpl.subject, ok, error: err,
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}