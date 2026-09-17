import { Link } from "react-router-dom";
import { gbpMoney } from "@/lib/pricing";

// Short details form: name, email, phone, address, optional message, terms
// tick-box, and the facilities tick-box where it applies. The primary action
// is "Pay and confirm — £X" (Stripe checkout); a secondary enquiry path is
// kept for questions or unavailable dates.
function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-line py-3 text-ink focus:outline-none focus:border-sea min-h-[44px]"
      />
    </div>
  );
}

export default function EnquiryForm({
  details,
  setDetails,
  terms,
  setTerms,
  facilitiesAck,
  setFacilitiesAck,
  marketing,
  setMarketing,
  affected,
  pastFullRefund,
  cancelPercent,
  coolingOffPhrase,
  cancelAck,
  setCancelAck,
  canSubmit,
  submitting,
  onSubmit,
  onEnquiry,
  amountDue,
  payableInFull,
  payInFull,
  setPayInFull,
  breakdown,
  balanceDueDate,
  error,
}) {
  const update = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <div className="grid sm:grid-cols-2 gap-6">
        <Field label="Full name" value={details.name} onChange={update("name")} />
        <Field label="Email" type="email" value={details.email} onChange={update("email")} />
        <Field label="Phone" value={details.phone} onChange={update("phone")} />
        <Field label="Address" value={details.address} onChange={update("address")} />
      </div>
      <div className="mt-6">
        <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-2">Message (optional)</label>
        <textarea
          value={details.message}
          onChange={(e) => update("message")(e.target.value)}
          rows={3}
          className="w-full bg-transparent border-b border-line py-3 text-ink focus:outline-none focus:border-sea"
        />
      </div>

      <div className="mt-6">
        <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-2">How did you hear about us?</label>
        <select
          value={details.how_heard || ""}
          onChange={(e) => update("how_heard")(e.target.value)}
          className="w-full bg-transparent border-b border-line py-3 text-ink focus:outline-none focus:border-sea min-h-[44px]"
        >
          <option value="">Select…</option>
          <option>Search (Google)</option>
          <option>Instagram</option>
          <option>Facebook</option>
          <option>Recommended by a friend</option>
          <option>Returning guest</option>
          <option>Saw the park / a sign</option>
          <option>Other</option>
        </select>
      </div>

      <label className="flex items-start gap-3 mt-6 cursor-pointer min-h-[44px]">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="w-5 h-5 mt-1 accent-sea shrink-0" />
        <span className="text-sm text-ink-soft">
          I have read and agree to the <Link to="/terms" className="text-sea underline">terms &amp; conditions</Link>.
        </span>
      </label>

      {pastFullRefund && (
        <label className="flex items-start gap-3 mt-4 cursor-pointer min-h-[44px]">
          <input type="checkbox" checked={cancelAck} onChange={(e) => setCancelAck(e.target.checked)} className="w-5 h-5 mt-1 accent-sea shrink-0" />
          <span className="text-sm text-ink-soft">
            {cancelPercent === 0
              ? `I understand that after ${coolingOffPhrase}, cancelling this booking would not be refunded.`
              : `I understand that after ${coolingOffPhrase}, cancelling this booking would refund ${cancelPercent}%.`}
          </span>
        </label>
      )}

      {affected && (
        <label className="flex items-start gap-3 mt-4 cursor-pointer min-h-[44px]">
          <input type="checkbox" checked={facilitiesAck} onChange={(e) => setFacilitiesAck(e.target.checked)} className="w-5 h-5 mt-1 accent-sea shrink-0" />
          <span className="text-sm text-ink-soft">
            I understand the park's on-site facilities are closed for my dates and my booking is for the accommodation only.
          </span>
        </label>
      )}

      <label className="flex items-start gap-3 mt-4 cursor-pointer min-h-[44px]">
        <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="w-5 h-5 mt-1 accent-sea shrink-0" />
        <span className="text-sm text-ink-soft">
          Email me occasional last-minute availability and offers. No more than once a month.
        </span>
      </label>

      {error && <p className="text-sm text-destructive mt-4">{error}</p>}

      {!payableInFull && breakdown && (
        <div className="mt-6">
          <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-3">Payment</label>
          <div className="space-y-2">
            <label className={`flex items-start gap-3 cursor-pointer p-3 border min-h-[44px] ${!payInFull ? "border-sea bg-sea/5" : "border-line"}`}>
              <input type="radio" name="payment-choice" checked={!payInFull} onChange={() => setPayInFull(false)} className="w-5 h-5 mt-0.5 accent-sea shrink-0" />
              <span className="text-sm text-ink-soft">
                <strong className="text-ink">Pay deposit</strong> — {gbpMoney(breakdown.deposit)} now, {gbpMoney(breakdown.balance)} due by {balanceDueDate}
              </span>
            </label>
            <label className={`flex items-start gap-3 cursor-pointer p-3 border min-h-[44px] ${payInFull ? "border-sea bg-sea/5" : "border-line"}`}>
              <input type="radio" name="payment-choice" checked={payInFull} onChange={() => setPayInFull(true)} className="w-5 h-5 mt-0.5 accent-sea shrink-0" />
              <span className="text-sm text-ink-soft">
                <strong className="text-ink">Pay in full</strong> — {gbpMoney(breakdown.total)} now
              </span>
            </label>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className={`mt-6 w-full flex items-center justify-center px-6 py-4 text-sm font-medium transition-colors min-h-[44px] ${
          canSubmit && !submitting ? "bg-sea text-white hover:bg-sea-deep" : "bg-offseason text-muted-foreground cursor-not-allowed"
        }`}
      >
        {submitting ? "Starting checkout…" : `Pay and confirm — ${gbpMoney(amountDue)}`}
      </button>
      <p className="mt-3 text-xs text-muted-foreground text-center">
        {payableInFull
          ? "You'll pay the full amount by card via Stripe."
          : payInFull
          ? "You'll pay the full amount by card via Stripe — nothing further to pay."
          : `You'll pay a ${gbpMoney(amountDue)} deposit now by card via Stripe; the balance is due before arrival.`}
      </p>
      <button
        type="button"
        onClick={onEnquiry}
        disabled={!canSubmit || submitting}
        className="mt-4 w-full text-sm text-muted-foreground hover:text-sea underline min-h-[44px] disabled:opacity-50"
      >
        Have a question? Send an enquiry instead
      </button>
    </form>
  );
}