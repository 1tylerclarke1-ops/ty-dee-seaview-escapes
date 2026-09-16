import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  DEFAULT_CANCELLATION_POLICY,
  normalizePolicy,
  computeRefund,
  describeRefundTier,
  buildPolicyText,
  todayIso,
  formatCoolingOffExpiry,
} from "../../shared/cancellation.ts";
import { estimateStripeFee, createRefund } from "../../shared/stripe.ts";
import { toMinorUnits } from "../../shared/money.ts";

// Cancel a booking under the tiered refund policy. The refund amount is
// calculated server-side only, on money actually received (deposit + balance),
// and is never accepted from the client. confirm=false (default) returns a
// preview — cooling-off status, tier, days remaining, total paid, refund due,
// amount retained, the estimated Stripe fee and out-of-pocket cost — with no
// side effects, so the owner reviews before committing. confirm=true requires
// an admin caller, applies the refund to the booking record, and returns the
// result. Never refunds silently.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { booking_id, confirm } = body || {};
    if (!booking_id) {
      return Response.json({ error: "booking_id required" }, { status: 400 });
    }

    const booking = await base44.asServiceRole.entities.Booking.get(booking_id);
    if (!booking) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    const rows = await base44.asServiceRole.entities.CancellationPolicy.list();
    const policy = rows && rows.length ? normalizePolicy(rows[0]) : DEFAULT_CANCELLATION_POLICY;

    const today = todayIso();
    // Refund is always on money actually received — never from the client.
    const totalPaid = (booking.deposit_paid || 0) + (booking.balance_paid || 0);

    // Cooling-off: a fixed window from the booking's creation time. If the
    // owner already stored cooling_off_expires_at, honour that frozen value;
    // otherwise compute it from created_date + the current settings (and
    // persist it on confirm so a later settings change can't shift it).
    const bookedAtMs = booking.created_date
      ? new Date(booking.created_date).getTime()
      : Date.now();
    const coolingOffExpiresAtMs = booking.cooling_off_expires_at
      ? new Date(booking.cooling_off_expires_at).getTime()
      : null;

    const calc = computeRefund(booking.arrival_date, totalPaid, policy, today, {
      bookedAtMs,
      coolingOffExpiresAtMs,
      waiverAmount: Number(booking.damage_waiver) || 0,
    });

    const refundDue = calc.refundDue;
    const retained = calc.retained;
    const refundPercent = calc.refundPercent;
    const refundTier = calc.insideCoolingOff
      ? "100% (cooling-off)"
      : describeRefundTier(calc.tier, policy);
    const daysBeforeArrival = calc.daysBeforeArrival;
    const insideCoolingOff = calc.insideCoolingOff;
    const coolingOffExpiryMs = calc.coolingOffExpiryMs;

    // Stripe does not return its processing fee on a refund. If the actual fee
    // was stored on the booking at payment time (from the balance transaction),
    // use it; otherwise fall back to the UK-domestic estimate.
    const storedFee = Number(booking.stripe_fee);
    const hasActualFee = isFinite(storedFee) && storedFee > 0;
    const stripeFee = hasActualFee ? storedFee : estimateStripeFee(totalPaid);
    const feeSource = hasActualFee ? "actual" : "estimated";
    const outOfPocket = Math.max(0, refundDue + stripeFee - totalPaid);
    const netRetained = totalPaid - stripeFee - refundDue;

    const policyText = booking.cancellation_policy_text || buildPolicyText(policy);

    const preview = {
      booking_id,
      arrival_date: booking.arrival_date,
      guest_name: booking.guest_name,
      days_before_arrival: daysBeforeArrival,
      inside_cooling_off: insideCoolingOff,
      cooling_off_expires_at: coolingOffExpiryMs ? new Date(coolingOffExpiryMs).toISOString() : null,
      cooling_off_expires_display: coolingOffExpiryMs ? formatCoolingOffExpiry(coolingOffExpiryMs) : null,
      refund_percent: refundPercent,
      refund_tier: refundTier,
      reason: calc.reason,
      total_paid: totalPaid,
      refund_due: refundDue,
      retained,
      stripe_fee: stripeFee,
      fee_source: feeSource,
      net_retained: netRetained,
      out_of_pocket: outOfPocket,
      has_payment: !!booking.stripe_payment_intent_id,
      damage_waiver: Number(booking.damage_waiver) || 0,
      policy_text: policyText,
    };

    if (!confirm) {
      return Response.json({ ok: true, confirm: false, ...preview });
    }

    if (user.role !== "admin") {
      return Response.json({ error: "Admin required to cancel a booking" }, { status: 403 });
    }

    // Issue a real Stripe refund if there is a card payment and money is due.
    let refundPaid = 0;
    let refundError = null;
    if (refundDue > 0 && booking.stripe_payment_intent_id) {
      try {
        const refund = await createRefund({
          paymentIntentId: booking.stripe_payment_intent_id,
          amountPence: toMinorUnits(refundDue),
        });
        refundPaid = typeof refund.amount === "number" ? refund.amount / 100 : 0;
      } catch (e) {
        return Response.json({ ok: false, error: `Stripe refund failed: ${e.message}` }, { status: 502 });
      }
    }

    const updateData = {
      status: "cancelled",
      refund_due: refundDue,
      refund_paid: refundPaid,
      refund_date: today,
      refund_tier: refundTier,
      deposit_retained: retained,
    };
    if (!booking.cooling_off_expires_at && coolingOffExpiryMs) {
      updateData.cooling_off_expires_at = new Date(coolingOffExpiryMs).toISOString();
    }
    const updated = await base44.asServiceRole.entities.Booking.update(booking_id, updateData);

    return Response.json({ ok: true, confirm: true, ...preview, refund_paid: refundPaid, refund_error: refundError, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}