import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { todayIso } from "../../shared/cancellation.ts";
import { createRefund } from "../../shared/stripe.ts";
import { toMinorUnits } from "../../shared/money.ts";
import { computeRefundPreview } from "../../shared/cancellationPreview.ts";

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
    const { booking_id, confirm, balance_overdue } = body || {};
    if (!booking_id) {
      return Response.json({ error: "booking_id required" }, { status: 400 });
    }

    const booking = await base44.asServiceRole.entities.Booking.get(booking_id);
    if (!booking) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    // Shared preview computation — identical to what the guest sees on the
    // manage page and what cancelBookingByToken applies, so the figure the
    // owner reviews is exactly the figure the server refunds.
    const preview = await computeRefundPreview(base44, booking);
    preview.booking_id = booking_id;
    preview.damage_waiver = Number(booking.damage_waiver) || 0;

    const isBalanceOverdue = !!balance_overdue;
    const refundDue = isBalanceOverdue ? 0 : preview.refund_due;
    const retained = isBalanceOverdue ? preview.total_paid : preview.retained;
    const refundTier = isBalanceOverdue ? "Balance unpaid — deposit retained" : preview.refund_tier;
    const coolingOffExpiryMs = preview.cooling_off_expires_at
      ? new Date(preview.cooling_off_expires_at).getTime()
      : null;
    const today = todayIso();

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
      balance_overdue_flagged: false,
    };
    if (isBalanceOverdue) {
      updateData.notes = (booking.notes || "") + "\n\nCancelled for non-payment of balance. Deposit retained, dates released.";
    }
    if (!booking.cooling_off_expires_at && coolingOffExpiryMs) {
      updateData.cooling_off_expires_at = new Date(coolingOffExpiryMs).toISOString();
    }
    const updated = await base44.asServiceRole.entities.Booking.update(booking_id, updateData);

    return Response.json({ ok: true, confirm: true, ...preview, refund_paid: refundPaid, refund_error: refundError, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}