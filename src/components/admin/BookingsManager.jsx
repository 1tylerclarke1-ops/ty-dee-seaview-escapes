import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { base44 } from "@/api/base44Client";
import { gbpMoney } from "@/lib/pricing";

// Owner-facing bookings list with a tiered-refund cancellation flow. Cancelling
// is never silent: "Review cancellation" calls the cancelBooking function for
// a preview (tier, days remaining, amount paid, refund due, retained), the
// owner adjusts the amount paid if needed, then confirms. The function applies
// the refund and records refund_due, refund_paid, refund_date and the tier on
// the booking.
export default function BookingsManager() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewId, setReviewId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [amountPaid, setAmountPaid] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.Booking
      .list("-arrival_date", 200)
      .then((rows) => setBookings(rows || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startReview = async (b) => {
    setReviewId(b.id);
    setPreview(null);
    setError(null);
    setLoadingPreview(true);
    try {
      const res = await base44.functions.invoke("cancelBooking", { booking_id: b.id, confirm: false });
      const data = res.data || res;
      setPreview(data);
      setAmountPaid(data.total_paid || 0);
    } catch (e) {
      setError("Could not load the cancellation review.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const recompute = async (newAmount) => {
    setAmountPaid(newAmount);
    if (!reviewId) return;
    try {
      const res = await base44.functions.invoke("cancelBooking", { booking_id: reviewId, confirm: false, amount_paid: newAmount });
      const data = res.data || res;
      setPreview(data);
    } catch {
      /* keep last preview */
    }
  };

  const confirmCancel = async () => {
    setConfirming(true);
    setError(null);
    try {
      await base44.functions.invoke("cancelBooking", { booking_id: reviewId, confirm: true, amount_paid: amountPaid });
      setReviewId(null);
      setPreview(null);
      load();
    } catch (e) {
      setError("Could not cancel — are you signed in as admin?");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <p className="text-sm text-white/50">Loading bookings…</p>;

  return (
    <div className="space-y-6">
      {bookings.length === 0 && <p className="text-sm text-white/50">No bookings yet.</p>}

      {bookings.map((b) => (
        <div key={b.id} className="border border-white/10 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-white font-medium">{b.guest_name || "—"}</p>
              <p className="text-sm text-white/60 tnum">
                Arriving {b.arrival_date ? format(parseISO(b.arrival_date), "d MMM yyyy") : "—"} · {b.nights || 0} nights · {b.guests || 0} guests
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs tracking-wide uppercase text-white/40">{b.status}</p>
              <p className="text-sm text-white/70 tnum">
                Paid {gbpMoney((b.deposit_paid || 0) + (b.balance_paid || 0))}
              </p>
            </div>
          </div>

          {b.status === "cancelled" ? (
            <div className="mt-4 pt-4 border-t border-white/10 text-sm text-white/60 tnum">
              Cancelled · refund due {gbpMoney(b.refund_due || 0)} · retained {gbpMoney(b.deposit_retained || 0)} · tier {b.refund_tier || "—"}
            </div>
          ) : (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => startReview(b)}
                className="text-sm text-sea hover:underline"
              >
                Review cancellation
              </button>

              {reviewId === b.id && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  {loadingPreview && <p className="text-sm text-white/50">Calculating refund…</p>}
                  {error && <p className="text-sm text-signal">{error}</p>}
                  {preview && (
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs tracking-wide uppercase text-white/40">Days remaining</p>
                          <p className="text-white tnum">{preview.days_before_arrival} days</p>
                        </div>
                        <div>
                          <p className="text-xs tracking-wide uppercase text-white/40">Tier that applies</p>
                          <p className="text-white tnum">{preview.refund_tier}</p>
                        </div>
                        <div>
                          <p className="text-xs tracking-wide uppercase text-white/40">Amount paid</p>
                          <input
                            type="number"
                            min={0}
                            value={amountPaid}
                            onChange={(e) => recompute(Number(e.target.value))}
                            className="w-full bg-transparent border-b border-white/30 py-1 text-white tnum focus:outline-none focus:border-sea min-h-[36px]"
                          />
                          <p className="text-[0.65rem] text-white/40 mt-1">Adjust if the record is out of date — refund is on money received.</p>
                        </div>
                        <div>
                          <p className="text-xs tracking-wide uppercase text-white/40">Refund due / retained</p>
                          <p className="text-white tnum">{gbpMoney(preview.refund_due)} / {gbpMoney(preview.retained)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pt-2">
                        <button
                          type="button"
                          onClick={confirmCancel}
                          disabled={confirming}
                          className="bg-signal text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-50"
                        >
                          {confirming ? "Cancelling…" : "Confirm cancellation"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setReviewId(null); setPreview(null); setError(null); }}
                          className="text-sm text-white/60 hover:text-white"
                        >
                          Keep booking
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}