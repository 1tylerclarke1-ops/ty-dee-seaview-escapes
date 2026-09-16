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
import { estimateStripeFee } from "../../shared/stripe.ts";

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

    // Stripe does not return its processing fee on a refund. Estimate it on
    // the original payment so the owner sees the true out-of-pocket cost.
    const stripeFee = estimateStripeFee(totalPaid);
    const outOfPocket = Math.max(0, refundDue + stripeFee - totalPaid);

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
      out_of_pocket: outOfPocket,
      policy_text: policyText,
    };

    if (!confirm) {
      return Response.json({ ok: true, confirm: false, ...preview });
    }

    if (user.role !== "admin") {
      return Response.json({ error: "Admin required to cancel a booking" }, { status: 403 });
    }

    const updateData = {
      status: "cancelled",
      refund_due: refundDue,
      refund_paid: 0,
      refund_date: today,
      refund_tier: refundTier,
      deposit_retained: retained,
    };
    if (!booking.cooling_off_expires_at && coolingOffExpiryMs) {
      updateData.cooling_off_expires_at = new Date(coolingOffExpiryMs).toISOString();
    }
    const updated = await base44.asServiceRole.entities.Booking.update(booking_id, updateData);

    return Response.json({ ok: true, confirm: true, ...preview, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}