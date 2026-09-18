import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { allowedLengthsForArrival } from "@/lib/pricing";

// Admin-only "Send test emails" — renders the real production email templates
// for a synthetic booking priced from the live engine, and sends them to an
// address you enter. Choose which email: the booking confirmation + owner
// digest, the post-stay review request, or the marketing-consent ask. Nothing
// is saved — no booking, no contact, no review, no consent record — only an
// EmailLog row marked as a test. Every subject is prefixed [TEST].
export default function SendTestEmails() {
  const def = new Date();
  def.setDate(def.getDate() + 75);
  const [arrivalDate, setArrivalDate] = useState(def.toISOString().slice(0, 10));
  const [nights, setNights] = useState(7);
  const [which, setWhich] = useState("booking");

  const allowedLengths = useMemo(() => {
    try {
      return allowedLengthsForArrival(new Date(arrivalDate + "T00:00:00Z"));
    } catch {
      return [];
    }
  }, [arrivalDate]);
  const nightsValid = allowedLengths.includes(Number(nights));
  const [recipient, setRecipient] = useState("");
  const [guestName, setGuestName] = useState("Test Guest");
  const [guests, setGuests] = useState(2);
  const [dogCount, setDogCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const emailCount = which === "booking" ? 2 : 1;

  const send = async () => {
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke("sendTestBookingEmails", {
        which,
        arrival_date: arrivalDate,
        nights: Number(nights),
        recipient_email: recipient,
        guest_name: guestName,
        guests: Number(guests),
        dog_count: Number(dogCount),
      });
      const data = res?.data ?? res;
      if (data?.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Failed to send test emails");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border border-white/15 bg-white/[0.03] p-6 md:p-8">
      <p className="text-sm text-white/50">
        Builds a realistic booking from the live pricing engine and sends the real production email to an address you enter. Nothing is saved — no booking, no contact, no review, no consent record — only an EmailLog row marked as a test. The subject is prefixed [TEST].
      </p>

      <div className="mt-4">
        <span className="block text-xs text-white/50 mb-2">Which email</span>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "booking", label: "Booking confirmation + digest" },
            { id: "post_stay", label: "Post-stay review request" },
            { id: "consent", label: "Marketing-consent ask" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setWhich(opt.id)}
              className={`px-3 py-2 text-sm border min-h-[44px] ${which === opt.id ? "bg-white text-ink border-white" : "bg-transparent text-white/70 border-white/20 hover:border-white/40"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 border border-signal/30 bg-signal/10 p-3 text-sm text-signal">
        This sends <strong>{emailCount} email{emailCount === 1 ? "" : "s"}</strong> to the address below in one click. The per-recipient daily cap is roughly 3–4 — sending leaves little room for real emails to that address today. Use a throwaway address if you can.
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Arrival date">
          <input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Nights">
          <input type="number" min="1" max="28" value={nights} onChange={(e) => setNights(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Guest name">
          <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Guests">
          <input type="number" min="1" max="6" value={guests} onChange={(e) => setGuests(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Dogs">
          <input type="number" min="0" max="2" value={dogCount} onChange={(e) => setDogCount(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Send to (email)">
          <input type="email" placeholder="you@example.com" value={recipient} onChange={(e) => setRecipient(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={send}
          disabled={sending || !recipient || !nightsValid}
          className="bg-white text-ink px-5 py-2.5 text-sm font-medium hover:bg-white/90 disabled:opacity-50 min-h-[44px]"
        >
          {sending ? "Sending…" : "Send test email"}
        </button>
      </div>

      <p className="text-xs text-white/40 mt-2">
        Allowed stays for this arrival: {allowedLengths.length ? `${allowedLengths.join(", ")} night${allowedLengths.length === 1 ? "" : "s"}` : "none (outside season)"}. An arrival within ~60 days of today is payable in full; further out is a deposit booking.
      </p>
      {!nightsValid && allowedLengths.length > 0 && (
        <p className="text-xs text-signal mt-2">
          {nights} night{nights === 1 ? "" : "s"} isn't available on this arrival — pick one of {allowedLengths.join(", ")}.
        </p>
      )}

      {error && (
        <div className="mt-5 border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && <Result result={result} />}
    </div>
  );
}

const inputCls = "w-full bg-ink border border-white/20 text-white px-3 py-2 text-sm focus:border-white/40 outline-none";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-white/50 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Result({ result }) {
  const { guest, owner, post_stay, consent, breakdown, logs } = result;
  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {guest && <SendStatus title="Guest confirmation" data={guest} />}
        {owner && <SendStatus title="Owner digest" data={owner} />}
        {post_stay && <SendStatus title="Post-stay review request" data={post_stay} />}
        {consent && <SendStatus title="Marketing-consent ask" data={consent} />}
      </div>
      {breakdown && (
        <div className="border border-white/15 bg-white/[0.02] p-4 text-sm text-white/70">
          <p className="text-white/50 text-xs uppercase tracking-wide mb-2">Pricing used</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 tnum">
            <span>Season: {breakdown.seasonName || "—"}</span>
            <span>Total: £{Number(breakdown.total).toFixed(2)}</span>
            <span>Deposit: £{Number(breakdown.deposit).toFixed(2)}</span>
            <span>Balance: £{Number(breakdown.balance).toFixed(2)}</span>
            <span>{breakdown.payableInFull ? "Payable in full" : "Deposit at booking"}</span>
            <span>Balance due: {breakdown.balanceDue}</span>
          </div>
        </div>
      )}
      {logs && logs.length > 0 && (
        <div className="border border-white/15 bg-white/[0.02] p-4">
          <p className="text-white/50 text-xs uppercase tracking-wide mb-2">EmailLog entries</p>
          <ul className="divide-y divide-white/10">
            {logs.map((l) => (
              <li key={l.id} className="py-2 text-sm flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="text-white/80">
                  <span className={l.status === "sent" ? "text-emerald-400" : "text-red-400"}>{l.status}</span>
                  {" · "}{l.template}
                </div>
                <div className="text-white/50 text-xs tnum">
                  {l.sent_at ? format(new Date(l.sent_at), "EEE d MMM yyyy 'at' HH:mm") : ""} · {l.recipient}
                </div>
                {l.error && <div className="w-full text-red-300 text-xs break-words">{l.error}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SendStatus({ title, data }) {
  if (!data) return null;
  return (
    <div className={`border p-4 ${data.ok ? "border-emerald-500/40 bg-emerald-500/10" : "border-red-500/40 bg-red-500/10"}`}>
      <p className="text-sm font-medium text-white">{title}</p>
      <p className={`text-sm mt-1 ${data.ok ? "text-emerald-400" : "text-red-400"}`}>
        {data.ok ? "Sent" : "Failed"}
      </p>
      <p className="text-xs text-white/50 mt-1 break-words">{data.subject}</p>
      {data.error && <p className="text-xs text-red-300 mt-1 break-words">{data.error}</p>}
    </div>
  );
}