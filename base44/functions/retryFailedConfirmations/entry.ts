// Daily retry of failed confirmation emails — runs BEFORE the reminder job so
// confirmations get the first share of the daily email allowance. Prioritises:
//   1. Cancellation confirmations (guest needs proof a refund is coming)
//   2. Balance-paid confirmations (guest needs proof the balance is settled)
//   3. Booking confirmations (guest needs proof the deposit/booking landed)
// Reminders are NOT retried here — they have their own lower-priority job and
// halt on the first failure so they never crowd out a confirmation.
//
// Runs as a scheduled workflow (no user context) via the service role. Each
// send is logged to EmailLog and the booking flag is set on success. If the
// cap is hit mid-retry, the remaining confirmations wait for the next day.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { requireInternal } from "../../shared/internalCall.ts";
import { normalizePolicy, DEFAULT_CANCELLATION_POLICY, computeCoolingOffExpiry } from "../../shared/cancellation.ts";
import { calculatePrice, isPayableInFullIso } from "../../shared/pricing.ts";
import { logEmailAttempt } from "../../shared/emailLog.ts";
import { appBaseUrl } from "../../shared/origin.ts";
import { computeRefundPreview } from "../../shared/cancellationPreview.ts";
import { stayFacilitiesStatus, DEFAULT_FACILITIES_SETTINGS } from "../../shared/facilities.ts";
import {
  buildGuestCancellationEmail,
  buildBalancePaidEmail,
  buildGuestConfirmationEmail,
} from "../../shared/bookingEmail.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const _guard = await requireInternal(base44, req);
    if (_guard) return _guard;
    const base = appBaseUrl();
    const retried = [];
    let halted = false;

    const all = await base44.asServiceRole.entities.Booking.list("-updated_date", 500);

    // 1 — Cancellation confirmations (highest priority)
    const needCancellation = (all || []).filter(
      (b) => b.status === "cancelled" && b.cancellation_email_sent !== true && b.guest_email
    );
    for (const b of needCancellation) {
      const preview = await computeRefundPreview(base44, b);
      const tpl = buildGuestCancellationEmail({ booking: b, preview, appBaseUrl: base });
      const ok = await sendAndLog(base44, b, "cancellation_guest", tpl);
      if (ok) {
        await base44.asServiceRole.entities.Booking.update(b.id, { cancellation_email_sent: true }).catch(() => {});
      }
      retried.push({ ref: b.reference, type: "cancellation", ok });
      if (!ok) { halted = true; break; }
    }

    // 2 — Balance-paid confirmations
    if (!halted) {
      const needBalancePaid = (all || []).filter(
        (b) => b.status === "confirmed" && b.balance_paid > 0 && b.balance_paid_email_sent !== true && b.guest_email
      );
      for (const b of needBalancePaid) {
        const breakdown = calculatePrice(new Date(b.arrival_date + "T00:00:00Z"), b.nights, b.dog_count || 0);
        if (!breakdown) continue;
        const tpl = buildBalancePaidEmail({ booking: b, breakdown, appBaseUrl: base });
        const ok = await sendAndLog(base44, b, "balance_paid", tpl);
        if (ok) {
          await base44.asServiceRole.entities.Booking.update(b.id, { balance_paid_email_sent: true }).catch(() => {});
        }
        retried.push({ ref: b.reference, type: "balance_paid", ok });
        if (!ok) { halted = true; break; }
      }
    }

    // 3 — Booking confirmations
    if (!halted) {
      const needConfirmation = (all || []).filter(
        (b) => ["confirmed", "deposit_paid"].includes(b.status) && b.confirmation_email_sent !== true && b.guest_email
      );
      const policyRows = await base44.asServiceRole.entities.CancellationPolicy.list();
      const policy = policyRows && policyRows.length ? normalizePolicy(policyRows[0]) : DEFAULT_CANCELLATION_POLICY;
      const facRows = await base44.asServiceRole.entities.FacilitiesSettings.list();
      const settings = (facRows && facRows[0]) || DEFAULT_FACILITIES_SETTINGS;
      for (const b of needConfirmation) {
        const breakdown = calculatePrice(new Date(b.arrival_date + "T00:00:00Z"), b.nights, b.dog_count || 0);
        if (!breakdown) continue;
        const payableInFull = isPayableInFullIso(b.arrival_date);
        const bookedAtMs = b.created_date ? new Date(b.created_date).getTime() : Date.now();
        const coolingOffMs = b.cooling_off_expires_at
          ? new Date(b.cooling_off_expires_at).getTime()
          : computeCoolingOffExpiry(bookedAtMs, b.arrival_date, policy);
        const coolingOffIso = new Date(coolingOffMs).toISOString();
        const tpl = buildGuestConfirmationEmail({
          booking: b, breakdown, payableInFull, settings, coolingOffIso, appBaseUrl: base,
        });
        const ok = await sendAndLog(base44, b, "booking_confirmation_guest", tpl);
        if (ok) {
          await base44.asServiceRole.entities.Booking.update(b.id, { confirmation_email_sent: true }).catch(() => {});
        }
        retried.push({ ref: b.reference, type: "booking_confirmation", ok });
        if (!ok) { halted = true; break; }
      }
    }

    return Response.json({ ok: true, retried, halted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function sendAndLog(base44, booking, template, tpl) {
  let ok = false;
  let err = null;
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: booking.guest_email, subject: tpl.subject, text: tpl.text,
      ...(tpl.html ? { html: tpl.html } : {}),
    });
    ok = true;
  } catch (e) {
    err = e?.message || String(e);
  }
  await logEmailAttempt(base44, {
    booking_id: booking.id, recipient: booking.guest_email,
    template, subject: tpl.subject, ok, error: err,
  });
  return ok;
}