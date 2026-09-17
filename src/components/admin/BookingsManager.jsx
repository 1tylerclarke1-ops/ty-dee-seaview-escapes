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
  const [showExpired, setShowExpired] = useState(false);
  const [reviewId, setReviewId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [resendErrors, setResendErrors] = useState({});
  const [resendingOwnerId, setResendingOwnerId] = useState(null);
  const [resendOwnerErrors, setResendOwnerErrors] = useState({});
  const [logOpenId, setLogOpenId] = useState(null);
  const [logEntries, setLogEntries] = useState({});
  const [logLoading, setLogLoading] = useState(false);

  const resendConfirmation = async (b) => {
    setResendingId(b.id);
    setResendErrors((m) => ({ ...m, [b.id]: null }));
    try {
      const res = await base44.functions.invoke("sendBookingConfirmation", { booking_id: b.id, send: true });
      const data = res.data || res;
      if (data.sent) {
        load();
      } else {
        setResendErrors((m) => ({
          [b.id]: data.sendResult?.error || "Could not send — is the guest email a registered user, or is a custom domain connected?",
        }));
      }
    } catch (e) {
      const data = e?.data || e;
      setResendErrors((m) => ({ [b.id]: data?.error || "Could not send." }));
    } finally {
      setResendingId(null);
    }
  };

  const resendOwnerAlert = async (b) => {
    setResendingOwnerId(b.id);
    setResendOwnerErrors((m) => ({ ...m, [b.id]: null }));
    try {
      const res = await base44.functions.invoke("sendBookingConfirmation", { booking_id: b.id, send: true, target: "owner" });
      const data = res.data || res;
      if (data.sent) {
        load();
      } else {
        setResendOwnerErrors((m) => ({
          [b.id]: data.sendResult?.error || "Could not send owner alert.",
        }));
      }
    } catch (e) {
      const data = e?.data || e;
      setResendOwnerErrors((m) => ({ [b.id]: data?.error || "Could not send." }));
    } finally {
      setResendingOwnerId(null);
    }
  };

  const toggleLog = async (b) => {
    if (logOpenId === b.id) { setLogOpenId(null); return; }
    setLogOpenId(b.id);
    if (logEntries[b.id]) return;
    setLogLoading(true);
    try {
      const rows = await base44.entities.EmailLog.filter({ booking_id: b.id }, "-sent_at", 20);
      setLogEntries((m) => ({ ...m, [b.id]: rows || [] }));
    } catch {
      setLogEntries((m) => ({ ...m, [b.id]: [] }));
    } finally {
      setLogLoading(false);
    }
  };

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

  const visible = showExpired ? bookings : bookings.filter((b) => b.status !== "expired");
  const expiredCount = bookings.filter((b) => b.status === "expired").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="text-sm text-white/60 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showExpired}
            onChange={(e) => setShowExpired(e.target.checked)}
            className="accent-sea"
          />
          Show expired checkouts{expiredCount > 0 ? ` (${expiredCount})` : ""}
        </label>
      </div>
      {visible.length === 0 && <p className="text-sm text-white/50">No bookings {showExpired ? "" : "active "}yet.</p>}

      {visible.map((b) => (
        <div key={b.id} className="border border-white/10 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-white font-medium">{b.guest_name || "—"}</p>
              <p className="text-xs text-white/40 tnum">Ref {b.reference || "—"}</p>
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

          {(b.status === "deposit_paid" || b.status === "confirmed") && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {b.confirmation_email_sent ? (
                <span className="text-xs text-white/40">Confirmation email sent</span>
              ) : (
                <>
                  <span className="text-xs text-signal">Confirmation email not sent</span>
                  <button
                    type="button"
                    onClick={() => resendConfirmation(b)}
                    disabled={resendingId === b.id}
                    className="text-xs text-sea hover:underline disabled:opacity-50"
                  >
                    {resendingId === b.id ? "Sending…" : "Resend confirmation"}
                  </button>
                  {resendErrors[b.id] && <span className="text-xs text-signal">{resendErrors[b.id]}</span>}
                </>
              )}
              {b.owner_alert_sent ? (
                <span className="text-xs text-white/40">Owner alert sent</span>
              ) : (
                <>
                  <span className="text-xs text-signal">Owner alert not sent</span>
                  <button
                    type="button"
                    onClick={() => resendOwnerAlert(b)}
                    disabled={resendingOwnerId === b.id}
                    className="text-xs text-sea hover:underline disabled:opacity-50"
                  >
                    {resendingOwnerId === b.id ? "Sending…" : "Resend owner alert"}
                  </button>
                  {resendOwnerErrors[b.id] && <span className="text-xs text-signal">{resendOwnerErrors[b.id]}</span>}
                </>
              )}
              {b.status === "confirmed" && b.balance_paid > 0 && !b.balance_paid_email_sent && (
                <span className="text-xs text-signal">Balance paid email not sent</span>
              )}
              <button
                type="button"
                onClick={() => toggleLog(b)}
                className="text-xs text-white/50 hover:text-white/80"
              >
                {logOpenId === b.id ? "Hide email log" : "Email log"}
              </button>
              {logOpenId === b.id && (
                <div className="w-full mt-2 space-y-1">
                  {logLoading ? (
                    <p className="text-xs text-white/40">Loading…</p>
                  ) : logEntries[b.id]?.length ? (
                    logEntries[b.id].map((e) => (
                      <div key={e.id} className="text-xs text-white/60 tnum flex flex-wrap gap-x-3">
                        <span>{e.sent_at ? format(parseISO(e.sent_at), "d MMM HH:mm") : "—"}</span>
                        <span className={e.status === "sent" ? "text-sea" : "text-signal"}>{e.status}</span>
                        <span>{e.template}</span>
                        <span className="text-white/40">{e.recipient}</span>
                        {e.error && <span className="text-signal">⚠ {e.error}</span>}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-white/40">No email attempts logged.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {b.status === "cancelled" ? (
            <div className="mt-4 pt-4 border-t border-white/10 text-sm text-white/60 tnum">
              Cancelled · refund due {gbpMoney(b.refund_due || 0)} · retained {gbpMoney(b.deposit_retained || 0)} · tier {b.refund_tier || "—"}
            </div>
          ) : b.status === "expired" ? (
            <div className="mt-4 pt-4 border-t border-white/10 text-sm text-white/50">
              Expired — checkout abandoned, no payment taken. Dates released.
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
                        {preview.has_payment
                          ? <>Confirming issues a <strong className="text-white/80">Stripe refund of {gbpMoney(preview.refund_due)}</strong> to the guest's card. The fee Stripe keeps is not returned.</>
                          : <>No card payment on file — <strong className="text-white/80">recording the refund calculation only</strong>, no money is moved.</>}
                      </p>
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