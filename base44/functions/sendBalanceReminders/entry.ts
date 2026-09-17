// Daily job — sends balance payment reminders to deposit-paid guests and
// flags overdue balances for admin action. Runs as a scheduled workflow (no
// user context) via the service role.
//
// Reminder schedule (days before arrival):
//   70 days — friendly, "your balance is due on [date]"
//   60 days — due today
//   57 days — overdue, three days late, states consequence + cancellation date
//   55 days — final notice, "cancelled on [date] and deposit retained if unpaid"
//   53 days — last chance, cancels tomorrow
//
// At 55 days the booking is also flagged for the owner to text the guest
// personally (name, mobile and a suggested message appear in admin — no
// auto-send). At 53 days the booking is flagged balance_overdue_flagged.
// At 52 days the booking is automatically cancelled: deposit retained,
// dates released, guest emailed. The tokenised link stays live so the
// guest can see what happened. The owner has a 24-hour undo window.
//
// Reminders stop the moment the balance is paid (status moves to "confirmed").
// One reminder per booking per day: if multiple thresholds have passed, only
// the most urgent stage is sent and earlier ones are marked superseded.
// Each send is logged to EmailLog and recorded on the booking's
// balance_reminders_sent array so a reminder is never sent twice.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { daysBetween, todayIso } from "../../shared/cancellation.ts";
import { balanceDueIso } from "../../shared/pricing.ts";
import { logEmailAttempt } from "../../shared/emailLog.ts";
import { appBaseUrl } from "../../shared/origin.ts";
import { buildBalanceReminderEmail, buildAutoCancelEmail } from "../../shared/bookingEmail.ts";

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

      // Skip only if the guest is mid-checkout — an open balance session
      // created in the last hour. Not any write, not a whole day. The
      // "already paid" case is already handled by the status + balanceOwed
      // checks above.
      const sessionMs = fresh.balance_session_created_at
        ? new Date(fresh.balance_session_created_at).getTime() : 0;
      if (sessionMs && Date.now() - sessionMs < 3_600_000) continue;

      const remindersSent = fresh.balance_reminders_sent || [];
      const balanceDueDate = balanceDueIso(fresh.arrival_date);
      const manageUrl = fresh.cancel_token ? `${appBaseUrl()}/booking/${fresh.cancel_token}` : null;

      // One reminder per booking per day. If multiple thresholds have passed
      // (the job was down and the booking crossed two or three at once), send
      // only the MOST URGENT stage and mark the earlier ones as superseded so
      // they never fire — the guest gets one clear message, not three in a row.
      // Stages fire when their threshold has passed AND the stage isn't in
      // balance_reminders_sent (no upper bound on the day count, so missed
      // runs catch up). Reminders halt on the first send failure (likely the
      // daily email cap) to preserve the allowance for confirmations.
      const STAGES = ["70", "60", "57", "55", "53"];
      const dueStages = STAGES.filter(
        (s) => days <= Number(s) && !remindersSent.includes(s)
      );

      // Reminders only fire when more than 52 days remain — at 52 or below,
      // the auto-cancel takes over (no "cancels tomorrow" message when it's
      // already today). One per day: most urgent stage only, earlier ones
      // superseded. Halts on first failure to preserve the email allowance
      // for confirmations.
      if (days > 52 && dueStages.length > 0 && !remindersHalted) {
        const toSend = dueStages[dueStages.length - 1];
        const toSupersede = dueStages.slice(0, -1);

        const ok = await sendOne(base44, fresh, toSend, balanceOwed, balanceDueDate, days, manageUrl);
        if (!ok) remindersHalted = true;
        sent.push({ ref: fresh.reference, type: `${toSend}_days`, ok, superseded: toSupersede });

        if (ok) {
          try {
            await base44.asServiceRole.entities.Booking.update(fresh.id, {
              balance_reminders_sent: [...remindersSent, ...toSupersede, toSend],
            });
          } catch {}
        }
      }

      // Flagging always continues — overdue detection must not be blocked by email failures.
      if (days <= 53 && !fresh.balance_overdue_flagged) {
        await base44.asServiceRole.entities.Booking.update(fresh.id, {
          balance_overdue_flagged: true,
        });
        flagged.push({ ref: fresh.reference, guest: fresh.guest_name, email: fresh.guest_email });
      }

      // Day 55 — flag for the owner to text the guest personally. No auto-send;
      // just surface the name, mobile and a suggested message in admin.
      if (days <= 55 && !fresh.text_reminder_flagged) {
        let phone = null;
        try {
          const contacts = await base44.asServiceRole.entities.Contact.filter({
            email: fresh.guest_email,
          });
          if (contacts && contacts[0]) phone = contacts[0].phone || null;
        } catch {}
        try {
          await base44.asServiceRole.entities.Booking.update(fresh.id, {
            text_reminder_flagged: true,
            text_reminder_phone: phone || "",
          });
        } catch {}
      }

      // Day 52 — auto-cancel: retain the deposit, release the dates, email
      // the guest. The token is NOT invalidated — the manage link stays live
      // so the guest can see what happened and how to contact. The owner
      // has a 24-hour undo window in admin.
      if (days <= 52 && days >= 0) {
        await autoCancel(base44, fresh);
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
  return ok;
}

// Auto-cancel a booking for non-payment at day 52. Retains the deposit,
// releases the dates (status → cancelled), and emails the guest a warm
// message. The cancel_token is deliberately NOT cleared — the manage link
// stays live so the guest can see what happened and how to contact.
async function autoCancel(base44, booking) {
  const deposit = Number(booking.deposit_paid || 0);
  await base44.asServiceRole.entities.Booking.update(booking.id, {
    status: "cancelled",
    cancellation_reason: "unpaid_balance",
    auto_cancelled_at: new Date().toISOString(),
    deposit_retained: deposit,
    refund_due: 0,
    refund_paid: 0,
    refund_tier: "unpaid balance — deposit retained",
  });

  if (booking.guest_email) {
    const tpl = buildAutoCancelEmail({ booking, appBaseUrl: appBaseUrl() });
    let ok = false, err = null;
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: booking.guest_email, subject: tpl.subject, text: tpl.text, html: tpl.html,
      });
      ok = true;
    } catch (e) { err = e?.message || String(e); }
    await logEmailAttempt(base44, {
      booking_id: booking.id, recipient: booking.guest_email,
      template: "auto_cancel_unpaid", subject: tpl.subject, ok, error: err,
    });
    if (ok) {
      try {
        await base44.asServiceRole.entities.Booking.update(booking.id, {
          cancellation_email_sent: true,
        });
      } catch {}
    }
  }
}