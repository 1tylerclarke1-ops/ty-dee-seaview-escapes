import { Link } from "react-router-dom";

// Short details form: name, email, phone, address, optional message, terms
// tick-box, and the facilities tick-box where it applies. One submit button.
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
  affected,
  canSubmit,
  submitting,
  onSubmit,
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

      <label className="flex items-start gap-3 mt-6 cursor-pointer min-h-[44px]">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="w-5 h-5 mt-1 accent-sea shrink-0" />
        <span className="text-sm text-ink-soft">
          I have read and agree to the <Link to="/terms" className="text-sea underline">terms &amp; conditions</Link>.
        </span>
      </label>

      {affected && (
        <label className="flex items-start gap-3 mt-4 cursor-pointer min-h-[44px]">
          <input type="checkbox" checked={facilitiesAck} onChange={(e) => setFacilitiesAck(e.target.checked)} className="w-5 h-5 mt-1 accent-sea shrink-0" />
          <span className="text-sm text-ink-soft">
            I understand the park's on-site facilities are closed for my dates and my booking is for the accommodation only.
          </span>
        </label>
      )}

      {error && <p className="text-sm text-destructive mt-4">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className={`mt-6 w-full flex items-center justify-center px-6 py-4 text-sm font-medium transition-colors min-h-[44px] ${
          canSubmit && !submitting ? "bg-sea text-white hover:bg-sea-deep" : "bg-offseason text-muted-foreground cursor-not-allowed"
        }`}
      >
        {submitting ? "Checking…" : "Request these dates"}
      </button>
    </form>
  );
}