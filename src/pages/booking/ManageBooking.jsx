import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useNoIndex } from "@/components/NoIndex";
import { BUSINESS } from "@/lib/siteConfig";
import { ArrowLeft, ShieldCheck } from "lucide-react";

// Public, tokenised manage/cancel page. A link like /booking/<token> opens one
// booking and only that booking — no account, no password. Shows the booking
// reference, dates, guests, what's paid, what's owed and when, the cooling-off
// deadline, and the live refund position. "Cancel this booking" previews the
// exact refund before a confirmation step, then issues the Stripe refund using
// the existing tier + cooling-off logic, emails both parties, and releases the
// dates. The token is invalidated once the stay completes or the booking is
// cancelled (those states reveal no booking details).
const gbp = (n) => `£${Number(n || 0).toFixed(2)}`;
const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00Z");
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(d);
};
const fmtCooling = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "Europe/London",
  });
};

export default function ManageBooking() {
  useNoIndex();
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [stage, setStage] = useState("idle"); // idle | previewing | confirming | cancelling | done
  const [preview, setPreview] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let live = true;
    base44.functions
      .invoke("getBookingByToken", { token })
      .then((res) => { if (live) setData(res?.data ?? res); })
      .catch((e) => { if (live) setLoadError(e?.response?.data?.error || e?.message || "Could not load this booking"); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [token]);

  const startCancel = async () => {
    setStage("previewing");
    setActionError(null);
    try {
      const res = await base44.functions.invoke("cancelBookingByToken", { token, confirm: false });
      const p = res?.data ?? res;
      if (p?.error) { setActionError(p.error); setStage("idle"); return; }
      setPreview(p);
      setStage("confirming");
    } catch (e) {
      setActionError(e?.response?.data?.error || e?.message || "Could not preview the refund");
      setStage("idle");
    }
  };

  const confirmCancel = async () => {
    setStage("cancelling");
    setActionError(null);
    try {
      const res = await base44.functions.invoke("cancelBookingByToken", { token, confirm: true });
      const r = res?.data ?? res;
      if (r?.error) { setActionError(r.error); setStage("confirming"); return; }
      setResult(r);
      setStage("done");
    } catch (e) {
      setActionError(e?.response?.data?.error || e?.message || "Cancellation failed");
      setStage("confirming");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-line border-t-sea rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return <Wrap><ErrorBox message={loadError} /></Wrap>;
  }

  if (!data) return null;

  if (data.state === "not_found") {
    return <Wrap><InfoState title="This link is no longer valid" body="Your booking may have been cancelled, the stay may have completed, or the link may have expired. If you need help, please contact us." /></Wrap>;
  }
  if (data.state === "cancelled") {
    return <Wrap><InfoState title="This booking has been cancelled" body="A cancellation confirmation was emailed to you when the booking was cancelled. If you didn't receive it, or you need help, please contact us." /></Wrap>;
  }
  if (data.state === "completed") {
    return <Wrap><InfoState title="This stay has completed" body="This booking can no longer be managed online. We hope you enjoyed your stay at Ty Dee Seaview Escapes." /></Wrap>;
  }
  if (data.state === "not_cancellable") {
    return <Wrap><InfoState title="This booking can't be managed online" body="If you need to make changes or cancel, please contact us directly." /></Wrap>;
  }

  const b = data.booking;
  const p = data.preview;
  const inCooling = p.inside_cooling_off;

  return (
    <Wrap>
      <p className="text-sm text-muted mb-2">Manage your booking</p>
      <h1 className="text-3xl md:text-4xl mb-1">Your stay at {BUSINESS.name}</h1>
      <p className="text-sm text-muted mb-8">Booking ref <span className="tnum text-ink">{b.id}</span></p>

      <div className="grid md:grid-cols-2 gap-5">
        <Card title="Your stay">
          <Row label="Arriving" value={fmtDate(b.arrival_date)} />
          <Row label="Departing" value={fmtDate(b.departure_date)} />
          <Row label="Length" value={`${b.nights} night${b.nights === 1 ? "" : "s"}`} />
          <Row label="Guests" value={b.guests} />
          {b.dog_count > 0 && <Row label="Dogs" value={b.dog_count} />}
        </Card>

        <Card title="Payment">
          <Row label="Total" value={gbp(b.gross_revenue)} />
          <Row label="Paid" value={gbp(b.deposit_paid + b.balance_paid)} />
          {b.balance_owed > 0 ? (
            <Row label="Balance due" value={`${gbp(b.balance_owed)} by ${fmtDate(b.balance_due_date)}`} />
          ) : (
            <Row label="Balance" value="Paid in full" />
          )}
        </Card>

        <Card title="Cooling-off">
          {b.cooling_off_expires_at ? (
            <>
              <Row label="Full refund until" value={fmtCooling(b.cooling_off_expires_at)} />
              <p className="text-sm text-muted mt-3">Cancel before this time and everything you've paid is refunded.</p>
            </>
          ) : (
            <p className="text-sm text-muted">The cooling-off window for this booking has passed.</p>
          )}
        </Card>

        <Card title="Refund position if you cancel now">
          <Row label="Days before arrival" value={p.days_before_arrival} />
          <Row label="Refund tier" value={p.refund_tier} />
          <Row label="You'd get back" value={gbp(p.refund_due)} strong />
          {p.retained > 0 && <Row label="Retained" value={gbp(p.retained)} />}
          <p className="text-sm text-muted mt-3">
            {inCooling
              ? "You're within the cooling-off window — a full refund applies."
              : `Based on the cancellation policy, ${p.refund_percent}% of what you've paid would be refunded.`}
          </p>
        </Card>
      </div>

      <div className="mt-8">
        {stage === "idle" && (
          <button
            type="button"
            onClick={startCancel}
            className="bg-[#B3261E] text-white px-6 py-3 text-sm font-medium hover:opacity-90 min-h-[44px]"
          >
            Cancel this booking
          </button>
        )}

        {stage === "previewing" && (
          <p className="text-sm text-muted flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-line border-t-sea rounded-full animate-spin inline-block" />
            Working out your refund…
          </p>
        )}

        {stage === "confirming" && preview && (
          <div className="border border-[#B3261E]/40 bg-[#B3261E]/5 p-5 md:p-6">
            <h2 className="text-xl mb-2">Confirm cancellation</h2>
            <p className="text-sm text-ink-soft mb-4">
              Cancelling will refund <strong className="tnum">{gbp(preview.refund_due)}</strong> ({preview.refund_percent}%) to your original payment method within 10 working days
              {preview.retained > 0 && <> and retain {gbp(preview.retained)}</>}. The dates will be released and the booking cannot be restored.
            </p>
            {actionError && <p className="text-sm text-[#B3261E] mb-3">{actionError}</p>}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={confirmCancel}
                disabled={stage !== "confirming"}
                className="bg-[#B3261E] text-white px-6 py-3 text-sm font-medium hover:opacity-90 min-h-[44px]"
              >
                Yes, cancel my booking
              </button>
              <button
                type="button"
                onClick={() => { setStage("idle"); setPreview(null); setActionError(null); }}
                className="border border-line text-ink px-6 py-3 text-sm font-medium hover:bg-offseason min-h-[44px]"
              >
                Keep my booking
              </button>
            </div>
          </div>
        )}

        {stage === "cancelling" && (
          <p className="text-sm text-muted flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-line border-t-sea rounded-full animate-spin inline-block" />
            Processing your refund…
          </p>
        )}

        {stage === "done" && result && (
          <div className="border border-sea/40 bg-sea/5 p-5 md:p-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-sea" />
              <h2 className="text-xl">Booking cancelled</h2>
            </div>
            <p className="text-sm text-ink-soft mb-1">
              A refund of <strong className="tnum">{gbp(result.refund_due)}</strong> ({result.refund_percent}%) will be returned to your original payment method within 10 working days.
            </p>
            <p className="text-sm text-muted">
              A confirmation has been emailed to you. The dates have been released.
            </p>
          </div>
        )}

        {stage === "idle" && (
          <p className="text-xs text-muted mt-3">
            Or read <Link to="/terms" className="text-sea underline">our cancellation policy</Link>.
          </p>
        )}
      </div>
    </Wrap>
  );
}

function Wrap({ children }) {
  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-12 md:py-20">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to site
        </Link>
        {children}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="border border-line bg-surface p-5 md:p-6">
      <h2 className="text-xs uppercase tracking-wide text-muted mb-4">{title}</h2>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className={`text-right ${strong ? "text-ink font-medium" : "text-ink"} tnum`}>{value}</span>
    </div>
  );
}

function InfoState({ title, body }) {
  return (
    <div className="border border-line bg-surface p-8 text-center">
      <h1 className="text-2xl mb-3">{title}</h1>
      <p className="text-muted max-w-md mx-auto">{body}</p>
      <Link to="/contact" className="inline-block mt-6 text-sea underline text-sm">Contact us</Link>
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="border border-[#B3261E]/40 bg-[#B3261E]/5 p-6 text-center">
      <p className="text-ink">{message}</p>
      <Link to="/" className="inline-block mt-6 text-sea underline text-sm">Return to the home page</Link>
    </div>
  );
}