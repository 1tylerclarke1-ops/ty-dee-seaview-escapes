// Daily job — sends balance payment reminders to deposit-paid guests and
// flags overdue balances for admin action. Runs as a scheduled workflow (no
// user context) via the service role.
//
// Reminder schedule (days before arrival):
//   70 days — friendly, "your balance is due on [date]"
//   60 days — due today
//   55 days — overdue, stating what happens if it is not paid
//
// At 53 days (7 days after the 60-day due date), the booking is flagged
// balance_overdue_flagged for the admin dashboard — the owner decides whether
// to cancel and release (no auto-cancel).
//
// Reminders stop the moment the balance is paid (status moves to "confirmed").
// Each send is logged to EmailLog and recorded on the booking's
// balance_reminders_sent array so a reminder is never sent twice.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { daysBetween, todayIso } from "../../shared/cancellation.ts";
import { balanceDueIso } from "../../shared/pricing.ts";
import { logEmailAttempt } from "../../shared/emailLog.ts";
import { appBaseUrl } from "../../shared/origin.ts";
import { buildBalanceReminderEmail } from "../../shared/bookingEmail.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const bookings = await base44.asServiceRole.entities.Booking.filter({
      status: "deposit_paid",
    });
    const today = todayIso();
    const sent = [];
    const flagged = [];

    let remindersHalted = false;

    for (const b of bookings || []) {
      // Re-fetch the booking right before processing — the guest may have
      // paid their balance moments ago, during this run. Never rely on a
      // status read at the start of the run.
      const fresh = await base44.asServiceRole.entities.Booking.get(b.id).catch(() => null);
      if (!fresh || fresh.status !== "deposit_paid") continue;

      const days = daysBetween(today, fresh.arrival_date);
      if (days < 0) continue;

      const totalPaid = Number(fresh.deposit_paid || 0) + Number(fresh.balance_paid || 0);
      const balanceOwed = Math.max(Number(fresh.gross_revenue || 0) - totalPaid, 0);
      if (balanceOwed <= 0) continue;

      // Skip if the guest paid or started a checkout session within the last
      // 24 hours — a reminder now would be redundant or confusing.
      const updatedMs = fresh.updated_date ? new Date(fresh.updated_date).getTime() : 0;
      if (updatedMs && Date.now() - updatedMs < 86_400_000) continue;

      const remindersSent = fresh.balance_reminders_sent || [];
      const balanceDueDate = balanceDueIso(fresh.arrival_date);
      const manageUrl = fresh.cancel_token ? `${appBaseUrl()}/booking/${fresh.cancel_token}` : null;

      // Each reminder fires when its threshold has passed AND it hasn't been
      // sent yet — no upper bound on the day count. If the daily run is missed
      // for a day or a week, the next run catches up every missed reminder.
      // If multiple thresholds have passed, all missed reminders fire in one
      // run (the guest receives each one, oldest first).
      // Reminders halt on the first send failure (likely the daily email cap) —
      // this preserves the remaining allowance for confirmations, which matter
      // more. The failed reminder and all unsent ones retry the next day.
      if (!remindersHalted && days <= 70 && !remindersSent.includes("70")) {
        const ok = await sendOne(base44, fresh, "70", balanceOwed, balanceDueDate, days, manageUrl);
        if (!ok) remindersHalted = true;
        sent.push({ ref: fresh.reference, type: "70_days", ok });
      }
      if (!remindersHalted && days <= 60 && !remindersSent.includes("60")) {
        const ok = await sendOne(base44, fresh, "60", balanceOwed, balanceDueDate, days, manageUrl);
        if (!ok) remindersHalted = true;
        sent.push({ ref: fresh.reference, type: "60_days", ok });
      }
      if (!remindersHalted && days <= 55 && !remindersSent.includes("55")) {
        const ok = await sendOne(base44, fresh, "55", balanceOwed, balanceDueDate, days, manageUrl);
        if (!ok) remindersHalted = true;
        sent.push({ ref: fresh.reference, type: "55_days", ok });
      }
      // Flagging always continues — overdue detection must not be blocked by email failures.
      if (days <= 53 && !fresh.balance_overdue_flagged) {
        await base44.asServiceRole.entities.Booking.update(fresh.id, {
          balance_overdue_flagged: true,
        });
        flagged.push({ ref: fresh.reference, guest: fresh.guest_name, email: fresh.guest_email });
      }
    }

    const failed = sent.filter((s) => !s.ok);
    return Response.json({ ok: true, sent, failed, flagged });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function sendOne(base44, booking, stage, balanceOwed, balanceDueDate, daysBeforeArrival, manageUrl) {
  if (!booking.guest_email || !manageUrl) return true;
  const { subject, text, html } = buildBalanceReminderEmail({
    booking, stage, balanceOwed, balanceDueDate, daysBeforeArrival, manageUrl,
  });
  let ok = false;
  let err = null;
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: booking.guest_email, subject, text, html,
    });
    ok = true;
  } catch (e) {
    err = e?.message || String(e);
  }
  await logEmailAttempt(base44, {
    booking_id: booking.id, recipient: booking.guest_email,
    template: `balance_reminder_${stage}`, subject, ok, error: err,
  });
  if (ok) {
    const reminders = booking.balance_reminders_sent || [];
    if (!reminders.includes(stage)) {
      try {
        await base44.asServiceRole.entities.Booking.update(booking.id, {
          balance_reminders_sent: [...reminders, stage],
        });
      } catch {}
    }
  }
  return ok;
}