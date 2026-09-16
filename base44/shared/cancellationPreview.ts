// Shared refund-preview computation. The same preview is shown to the owner
// (admin cancelBooking), to the guest (getBookingByToken manage page), and
// applied on a guest-initiated cancel (cancelBookingByToken) — so the figure a
// guest sees before confirming is exactly the figure the server refunds.
// Refunds are always on money actually received (deposit + balance paid), and
// the cooling-off window is honoured first when it applies.

import {
  normalizePolicy,
  DEFAULT_CANCELLATION_POLICY,
  computeRefund,
  describeRefundTier,
  buildPolicyText,
  todayIso,
  formatCoolingOffExpiry,
} from "./cancellation.ts";
import { estimateStripeFee } from "./stripe.ts";

export async function computeRefundPreview(base44, booking) {
  const rows = await base44.asServiceRole.entities.CancellationPolicy.list();
  const policy = rows && rows.length ? normalizePolicy(rows[0]) : DEFAULT_CANCELLATION_POLICY;

  const today = todayIso();
  const totalPaid = (booking.deposit_paid || 0) + (booking.balance_paid || 0);

  const bookedAtMs = booking.created_date
    ? new Date(booking.created_date).getTime()
    : Date.now();
  const coolingOffExpiresAtMs = booking.cooling_off_expires_at
    ? new Date(booking.cooling_off_expires_at).getTime()
    : null;

  const calc = computeRefund(booking.arrival_date, totalPaid, policy, today, {
    bookedAtMs,
    coolingOffExpiresAtMs,
  });

  const refundDue = calc.refundDue;
  const retained = calc.retained;
  const refundPercent = calc.refundPercent;
  const refundTier = calc.insideCoolingOff
    ? "100% (cooling-off)"
    : describeRefundTier(calc.tier, policy);

  const storedFee = Number(booking.stripe_fee);
  const hasActualFee = isFinite(storedFee) && storedFee > 0;
  const stripeFee = hasActualFee ? storedFee : estimateStripeFee(totalPaid);
  const feeSource = hasActualFee ? "actual" : "estimated";
  const outOfPocket = Math.max(0, refundDue + stripeFee - totalPaid);
  const netRetained = totalPaid - stripeFee - refundDue;

  const policyText = booking.cancellation_policy_text || buildPolicyText(policy);

  return {
    booking_id: booking.id,
    arrival_date: booking.arrival_date,
    guest_name: booking.guest_name,
    days_before_arrival: calc.daysBeforeArrival,
    inside_cooling_off: calc.insideCoolingOff,
    cooling_off_expires_at: calc.coolingOffExpiryMs
      ? new Date(calc.coolingOffExpiryMs).toISOString()
      : null,
    cooling_off_expires_display: calc.coolingOffExpiryMs
      ? formatCoolingOffExpiry(calc.coolingOffExpiryMs)
      : null,
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
    policy_text: policyText,
  };
}