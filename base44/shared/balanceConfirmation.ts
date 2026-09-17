// Balance payment confirmation — the shared logic used by BOTH the return-to-site
// handler (confirmPayment) and the webhook (stripeWebhook) when a guest pays
// their outstanding balance from the manage page. Verifies the Stripe session
// server-side (paid, GBP, amount matches the balance owed), atomically flips
// the booking to "confirmed" with balance_paid set, and sends a balance-paid
// confirmation email. Idempotent — a booking already confirmed is skipped.

import { toMinorUnits, fromMinorUnits } from "./money.ts";
import { retrievePaymentFee } from "./stripe.ts";
import { calculatePrice } from "./pricing.ts";
import { logEmailAttempt } from "./emailLog.ts";
import { appBaseUrl } from "./origin.ts";
import { buildBalancePaidEmail } from "./bookingEmail.ts";

export async function confirmBalancePayment(base44, booking, session) {
  // Idempotency — already confirmed (by the other path or a prior run).
  if (booking.status === "confirmed") {
    return { already_confirmed: true };
  }
  // Only a deposit-paid booking can receive a balance payment.
  if (booking.status !== "deposit_paid") {
    return { error: "Booking is not awaiting a balance payment" };
  }

  // Verify the session server-side — never trust the browser.
  if (!session || session.payment_status !== "paid") {
    return { error: "Session is not paid" };
  }
  if ((session.currency || "").toLowerCase() !== "gbp") {
    return { error: "Currency is not GBP" };
  }

  // Recalculate the balance owed from the pricing engine + what's on file.
  const breakdown = calculatePrice(
    new Date(booking.arrival_date + "T00:00:00Z"),
    booking.nights,
    booking.dog_count || 0
  );
  if (!breakdown) return { error: "Could not price the stay" };
  const totalPaid = Number(booking.deposit_paid || 0) + Number(booking.balance_paid || 0);
  const balanceOwed = Math.max(breakdown.total - totalPaid, 0);
  const expectedPence = toMinorUnits(balanceOwed);
  if (session.amount_total !== expectedPence) {
    return { error: `Amount mismatch: expected ${expectedPence}, got ${session.amount_total}` };
  }

  // ATOMIC CONFIRM — conditional on { stripe_session_id, status: "deposit_paid" }
  // so the webhook and return-to-site never double-process.
  const paymentIntentId = session.payment_intent;
  let stripeFee = 0;
  if (paymentIntentId) {
    try { stripeFee = await retrievePaymentFee(paymentIntentId) || 0; } catch {}
  }

  const atomic = await base44.asServiceRole.entities.Booking.updateMany(
    { stripe_session_id: session.id, status: "deposit_paid" },
    {
      $set: {
        status: "confirmed",
        balance_paid: balanceOwed,
        stripe_payment_intent_id: paymentIntentId,
        stripe_fee: (Number(booking.stripe_fee) || 0) + stripeFee,
        balance_overdue_flagged: false,
      }
    }
  );
  if (!atomic || atomic.updated === 0) {
    return { already_confirmed: true };
  }

  const confirmedBooking = {
    ...booking,
    status: "confirmed",
    balance_paid: balanceOwed,
    stripe_payment_intent_id: paymentIntentId,
  };

  // Send the balance-paid confirmation email (best-effort, never blocks).
  await sendBalancePaidEmail(base44, confirmedBooking, breakdown);

  return { confirmed: true, status: "confirmed" };
}

async function sendBalancePaidEmail(base44, booking, breakdown) {
  if (!booking.guest_email) return;
  const { subject, text, html } = buildBalancePaidEmail({
    booking,
    breakdown,
    appBaseUrl: appBaseUrl(),
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
    template: "balance_paid", subject, ok, error: err,
  });
}