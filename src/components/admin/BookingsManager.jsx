import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { base44 } from "@/api/base44Client";
import { gbpMoney } from "@/lib/pricing";

// Owner-facing bookings list with a tiered-refund cancellation flow. Cancelling
// is never silent: "Review cancellation" calls the cancelBooking function for a
// server-calculated preview (cooling-off, tier, days remaining, total paid,
// refund due, retained, Stripe fee, out of pocket). The owner reviews, then
// confirms. The refund amount is never accepted from the client.
export default function BookingsManager() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewId, setReviewId] = useState(null);
  const [preview, setPreview] = useState(null);
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
    } catch (e) {
      setError("Could not load the cancellation review.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const confirmCancel = async () => {
    setConfirming(true);
    setError(null);
    try {
      await base44.functions.invoke("cancelBooking", { booking_id: reviewId, confirm: true });
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
                      {preview.inside_cooling_off ? (
                        <p className="text-sm text-sea">
                          Inside the cooling-off window — full refund{preview.cooling_off_expires_display ? ` (ends ${preview.cooling_off_expires_display})` : ""}.
                        </p>
                      ) : (
                        <p className="text-sm text-white/50">
                          Outside the cooling-off window{preview.cooling_off_expires_display ? ` (ended ${preview.cooling_off_expires_display})` : ""}.
                        </p>
                      )}
                      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 pb-3 border-b border-white/10">
                        <div>
                          <p className="text-xs tracking-wide uppercase text-white/40">You keep (net)</p>
                          <p className="text-2xl text-white tnum">{gbpMoney(preview.net_retained)}</p>
                        </div>
                        <p className="text-sm text-white/50 tnum">
                          Gross retained {gbpMoney(preview.retained)} · less Stripe fee {gbpMoney(preview.stripe_fee)}
                        </p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs tracking-wide uppercase text-white/40">Days to arrival</p>
                          <p className="text-white tnum">{preview.days_before_arrival} days</p>
                        </div>
                        <div>
                          <p className="text-xs tracking-wide uppercase text-white/40">Tier matched</p>
                          <p className="text-white tnum">{preview.refund_tier}</p>
                        </div>
                        <div>
                          <p className="text-xs tracking-wide uppercase text-white/40">Total paid</p>
                          <p className="text-white tnum">{gbpMoney(preview.total_paid)}</p>
                        </div>
                        <div>
                          <p className="text-xs tracking-wide uppercase text-white/40">Refund due</p>
                          <p className="text-white tnum">{gbpMoney(preview.refund_due)}</p>
                        </div>
                        <div>
                          <p className="text-xs tracking-wide uppercase text-white/40">Out of pocket</p>
                          <p className="text-signal tnum">{gbpMoney(preview.out_of_pocket)}</p>
                        </div>
                      </div>
                      <p className="text-[0.65rem] text-white/40">
                        Stripe fee {preview.fee_source === "actual" ? "actual (from balance transaction)" : "estimated — UK domestic card rate only; European/non-UK cards cost more"}. Refund is on money received — calculated server-side.
                      </p>

                      <p className="text-xs text-white/50 border border-white/10 p-3">
                        Confirming records the refund calculation on the booking only — <strong className="text-white/80">no money is moved via Stripe yet</strong>. The actual Stripe refund will be wired when the payment flow is built.
                      </p>
                      <div className="flex items-center gap-4 pt-2">
                        <button
                          type="button"
                          onClick={confirmCancel}
                          disabled={confirming}
                          className="bg-signal text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-50"
                        >
                          {confirming ? "Recording…" : "Confirm — record refund"}
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