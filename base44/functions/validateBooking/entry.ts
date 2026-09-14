// Server-side booking validation. Pure rule check — no SDK, no auth — so it
// can be called from the public booking flow. Rejects any stay the booking
// rules disallow (e.g. a 3- or 4-night stay in Peak summer), regardless of
// what the browser submitted.
import { allowedLengthsForArrival, seasonForDate } from "../../shared/bookingRules.ts";
import { calculatePrice, balanceDueIso, isPayableInFullIso } from "../../shared/pricing.ts";

export default async function (req) {
  try {
    const body = await req.json();
    const { arrival_date, nights } = body || {};

    if (!arrival_date || nights == null) {
      return Response.json(
        { valid: false, errors: ["arrival_date and nights are required"] },
        { status: 400 }
      );
    }

    const arrival = new Date(arrival_date);
    if (isNaN(arrival.getTime())) {
      return Response.json(
        { valid: false, errors: ["Invalid arrival date"] },
        { status: 400 }
      );
    }

    const n = Number(nights);
    if (!Number.isInteger(n) || n < 1) {
      return Response.json(
        { valid: false, errors: ["Invalid stay length"] },
        { status: 400 }
      );
    }

    const season = seasonForDate(arrival);
    if (!season) {
      return Response.json(
        { valid: false, errors: ["Arrival date is outside the booking season"] },
        { status: 400 }
      );
    }

    const allowed = allowedLengthsForArrival(arrival);
    const valid = allowed.includes(n);
    const errors = valid
      ? []
      : [
          `A ${n}-night stay is not available on ${arrival_date}. Available lengths: ${
            allowed.length ? allowed.join(", ") : "none"
          }.`,
        ];

    const breakdown = calculatePrice(arrival, n, 0);
    const payment_schedule = breakdown
      ? {
          total: breakdown.total,
          deposit: breakdown.deposit,
          balance: breakdown.balance,
          balance_due_date: balanceDueIso(arrival_date),
          payable_in_full: isPayableInFullIso(arrival_date),
        }
      : null;

    return Response.json({
      valid,
      errors,
      season: season.name,
      allowed_lengths: allowed,
      payment_schedule,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}