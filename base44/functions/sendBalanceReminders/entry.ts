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

    for (const b of bookings || []) {
      const days = daysBetween(today, b.arrival_date);
      if (days < 0) continue; // past arrival — skip

      const totalPaid = Number(b.deposit_paid || 0) + Number(b.balance_paid || 0);
      const balanceOwed = Math.max(Number(b.gross_revenue || 0) - totalPaid, 0);
      if (balanceOwed <= 0) continue; // nothing owed — skip

      const remindersSent = b.balance_reminders_sent || [];
      const balanceDueDate = balanceDueIso(b.arrival_date);
      const manageUrl = b.cancel_token ? `${appBaseUrl()}/booking/${b.cancel_token}` : null;

      // 70 days — friendly reminder (range 70..61)
      if (days <= 70 && days > 60 && !remindersSent.includes("70")) {
        await sendOne(base44, b, "70", balanceOwed, balanceDueDate, days, manageUrl);
        sent.push({ ref: b.reference, type: "70_days" });
      }
      // 60 days — due today (range 60..56)
      if (days <= 60 && days > 55 && !remindersSent.includes("60")) {
        await sendOne(base44, b, "60", balanceOwed, balanceDueDate, days, manageUrl);
        sent.push({ ref: b.reference, type: "60_days" });
      }
      // 55 days — overdue with consequences (range 55..54)
      if (days <= 55 && days > 53 && !remindersSent.includes("55")) {
        await sendOne(base44, b, "55", balanceOwed, balanceDueDate, days, manageUrl);
        sent.push({ ref: b.reference, type: "55_days" });
      }
      // 53 days — flag for admin (7 days after the due date)
      if (days <= 53 && !b.balance_overdue_flagged) {
        await base44.asServiceRole.entities.Booking.update(b.id, {
          balance_overdue_flagged: true,
        });
        flagged.push({ ref: b.reference, guest: b.guest_name, email: b.guest_email });
      }
    }

    return Response.json({ ok: true, sent, flagged });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function sendOne(base44, booking, stage, balanceOwed, balanceDueDate, daysBeforeArrival, manageUrl) {
  if (!booking.guest_email || !manageUrl) return;
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
}