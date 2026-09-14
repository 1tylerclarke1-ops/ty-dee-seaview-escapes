import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  DEFAULT_CANCELLATION_POLICY,
  normalizePolicy,
  computeRefund,
  describeRefundTier,
  buildPolicyText,
  todayIso,
  computeCoolingOffExpiry,
  formatCoolingOffExpiry,
} from "../../shared/cancellation.ts";

// Cancel a booking under the tiered refund policy. confirm=false (default)
// returns a preview — the tier that applies, days remaining, amount paid,
// refund due and amount retained — with no side effects, so the owner can
// review before committing. confirm=true requires an admin caller, applies
// the refund to the booking record and returns the result. The refund is
// always calculated on money actually received (deposit + balance paid), or
// on an explicit amount_paid override from the owner.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { booking_id, confirm, amount_paid } = body || {};
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
    const totalPaid =
      typeof amount_paid === "number" && isFinite(amount_paid) && amount_paid >= 0
        ? amount_paid
        : (booking.deposit_paid || 0) + (booking.balance_paid || 0);

    // Cooling-off: a fixed window from the booking's creation time. If the
    // owner already stored cooling_off_expires_at, honour that frozen value;
    // otherwise compute it from created_date + the current settings (and
    // persist it on confirm so a later settings change can't shift it).
    const bookedAtMs = booking.created_date
      ? new Date(booking.created_date).getTime()
      : Date.now();
    const coolingOffExpiryMs = booking.cooling_off_expires_at
      ? new Date(booking.cooling_off_expires_at).getTime()
      : computeCoolingOffExpiry(bookedAtMs, booking.arrival_date, policy);
    const insideCoolingOff = Date.now() < coolingOffExpiryMs;

    let refundPercent, refundDue, retained, refundTier, daysBeforeArrival;
    if (insideCoolingOff) {
      refundPercent = 100;
      refundDue = totalPaid;
      retained = 0;
      refundTier = "100% (cooling-off)";
    } else {
      const calc = computeRefund(booking.arrival_date, totalPaid, policy, today);
      refundPercent = calc.refundPercent;
      refundDue = calc.refundDue;
      retained = calc.retained;
      refundTier = describeRefundTier(calc.tier, policy);
      daysBeforeArrival = calc.daysBeforeArrival;
    }
    if (daysBeforeArrival === undefined) {
      daysBeforeArrival = Math.max(0, Math.floor((new Date(booking.arrival_date + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000));
    }
    const policyText = booking.cancellation_policy_text || buildPolicyText(policy);

    const preview = {
      booking_id,
      arrival_date: booking.arrival_date,
      guest_name: booking.guest_name,
      days_before_arrival: daysBeforeArrival,
      refund_percent: refundPercent,
      refund_tier: refundTier,
      total_paid: totalPaid,
      refund_due: refundDue,
      retained: retained,
      inside_cooling_off: insideCoolingOff,
      cooling_off_expires_at: new Date(coolingOffExpiryMs).toISOString(),
      cooling_off_expires_display: formatCoolingOffExpiry(coolingOffExpiryMs),
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
      balance_paid: totalPaid - (booking.deposit_paid || 0),
    };
    if (!booking.cooling_off_expires_at) {
      updateData.cooling_off_expires_at = new Date(coolingOffExpiryMs).toISOString();
    }
    const updated = await base44.asServiceRole.entities.Booking.update(booking_id, updateData);

    return Response.json({ ok: true, confirm: true, ...preview, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}