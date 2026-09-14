import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { gbpMoney } from "@/lib/pricing";
import { SEGMENTS, segmentLabel } from "@/lib/segments";
import { OFFER_TEMPLATE_TYPES } from "@/lib/emailTemplatesClient";

const TYPE_LABELS = {
  extra_night: "Extra night (value)",
  free_dog: "Free dog (value)",
  late_checkout: "Late checkout (value)",
  percentage: "Percentage off",
  fixed_amount: "Fixed amount off",
};

// Compose a private offer against an unsold stay. Two steps:
//  1. Compose — pick type/value/segment; live floor-adjusted preview.
//  2. Review — create the offer, preview the email (recipient count + sample),
//     then send. Consent is enforced in the function.
export default function OfferComposer({ stay, onClose, onSent }) {
  const [step, setStep] = useState("compose");
  const [type, setType] = useState(stay.suggested_type || "extra_night");
  const [value, setValue] = useState(stay.suggested_max || 10);
  const [visibility] = useState(stay.suggested_visibility || "private");
  const [segment, setSegment] = useState(SEGMENTS[0].id);
  const [templateType, setTemplateType] = useState("late_availability");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState(null);
  const [offerId, setOfferId] = useState(null);
  const [emailPreview, setEmailPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const isMonetary = type === "percentage" || type === "fixed_amount";

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    base44.functions
      .invoke("createOffer", {
        arrival_date: stay.arrival_date, nights: stay.nights, type,
        value: isMonetary ? Number(value) : 0, visibility, segment, reason, confirm: false,
      })
      .then((res) => { if (!cancelled) setPreview((res.data || res).preview); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [type, value, visibility]);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("createOffer", {
        arrival_date: stay.arrival_date, nights: stay.nights, type,
        value: isMonetary ? Number(value) : 0, visibility, segment, reason, confirm: true,
      });
      const d = res.data || res;
      if (!d.offer_id) { setError(d.error || "Offer could not be created."); return; }
      setOfferId(d.offer_id);
      const ep = await base44.functions.invoke("sendOfferEmail", { offer_id: d.offer_id, segment, template_type: templateType, preview_only: true });
      setEmailPreview(ep.data || ep);
      setStep("review");
    } catch (e) {
      setError("Could not create the offer. Are you signed in as admin?");
    } finally {
      setBusy(false);
    }
  };

  const sendNow = async () => {
    setSending(true);
    setError(null);
    try {
      await base44.functions.invoke("sendOfferEmail", { offer_id: offerId, segment, template_type: templateType });
      onSent();
    } catch (e) {
      setError("Send failed. Emailing non-registered addresses needs a connected custom domain on a paid plan.");
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80">
      <div className="bg-surface text-ink w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs tracking-wide uppercase text-sea">{step === "compose" ? "New private offer" : "Review & send"}</p>
            <h3 className="text-2xl mt-1">
              {format(parseISO(stay.arrival_date), "EEE d MMM yyyy")} · {stay.nights} nights
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{stay.season} · {gbpMoney(stay.current_price)} · net {gbpMoney(stay.net_per_night)}/night</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-ink p-1"><X className="w-5 h-5" /></button>
        </div>

        {step === "compose" ? (
          <div className="space-y-5">
            <div>
              <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-2">Offer type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border-b border-line py-2 bg-transparent text-ink focus:outline-none focus:border-sea min-h-[44px]">
                {Object.entries(TYPE_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
              </select>
            </div>

            {isMonetary && (
              <div>
                <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-2">
                  {type === "percentage" ? "Percentage" : "Amount (£)"}{stay.suggested_max ? ` · max ${stay.suggested_max}${type === "percentage" ? "%" : ""}` : ""}
                </label>
                <input type="number" min={0} max={type === "percentage" ? (stay.suggested_max || 100) : undefined}
                  value={value} onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full border-b border-line py-2 bg-transparent text-ink tnum focus:outline-none focus:border-sea min-h-[44px]" />
              </div>
            )}

            <div>
              <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-2">Send to segment</label>
              <select value={segment} onChange={(e) => setSegment(e.target.value)} className="w-full border-b border-line py-2 bg-transparent text-ink focus:outline-none focus:border-sea min-h-[44px]">
                {SEGMENTS.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
              </select>
            </div>

            <div>
              <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-2">Email tone</label>
              <select value={templateType} onChange={(e) => setTemplateType(e.target.value)} className="w-full border-b border-line py-2 bg-transparent text-ink focus:outline-none focus:border-sea min-h-[44px]">
                {OFFER_TEMPLATE_TYPES.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
              </select>
            </div>

            <div>
              <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-2">Reason (optional)</label>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. cancellation, gap fill"
                className="w-full border-b border-line py-2 bg-transparent text-ink focus:outline-none focus:border-sea min-h-[44px]" />
            </div>

            {preview && (
              <div className="border border-line p-4 bg-base">
                <p className="text-xs tracking-wide uppercase text-muted-foreground">Floor preview</p>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Offer: </span><span className="text-ink">{preview.description}</span></div>
                  <div className="tnum"><span className="text-muted-foreground">Net/n after: </span>{gbpMoney(preview.net_per_night_after)}</div>
                  <div className="tnum"><span className="text-muted-foreground">Discount: </span>{gbpMoney(preview.discount)}</div>
                  <div><span className="text-muted-foreground">Floor: </span>{preview.passes_floor ? <span className="text-sea">passes</span> : <span className="text-destructive">breaches</span>}</div>
                  {preview.adjusted && <div className="col-span-2 text-xs text-signal">Reduced from {preview.requested_value}{type === "percentage" ? "%" : "£"} to clear the £60/night floor.</div>}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" disabled={busy || (preview && !preview.allowed)} onClick={create}
                className="bg-sea text-white px-5 py-3 text-sm font-medium hover:bg-sea-deep min-h-[44px] disabled:opacity-50">
                {busy ? "Working…" : "Create & preview email"}
              </button>
              <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-ink px-4 py-3">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="border border-line p-4 bg-base">
              <p className="text-sm"><span className="text-muted-foreground">Offer: </span>{preview?.description}</p>
              <p className="text-sm mt-1 tnum"><span className="text-muted-foreground">Net/n after offer: </span>{gbpMoney(preview?.net_per_night_after)}</p>
              <p className="text-sm mt-1"><span className="text-muted-foreground">Segment: </span>{segmentLabel(segment)}</p>
            </div>

            {emailPreview ? (
              <div className="border border-line p-4 bg-base">
                <p className="text-xs tracking-wide uppercase text-muted-foreground">Email preview</p>
                <p className="text-sm mt-2"><span className="text-muted-foreground">Subject: </span>{emailPreview.subject}</p>
                <p className="text-sm mt-1"><span className="text-muted-foreground">Recipients: </span>{emailPreview.recipient_count} consented contact(s)</p>
                {emailPreview.sample && (
                  <pre className="mt-3 text-xs text-ink-soft whitespace-pre-wrap border-t border-line pt-3 font-mono">{emailPreview.sample.text}</pre>
                )}
              </div>
            ) : <p className="text-sm text-muted-foreground">Loading email preview…</p>}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" disabled={sending} onClick={sendNow}
                className="bg-sea text-white px-5 py-3 text-sm font-medium hover:bg-sea-deep min-h-[44px] disabled:opacity-50">
                {sending ? "Sending…" : `Send to ${emailPreview?.recipient_count || 0} contact(s)`}
              </button>
              <button type="button" onClick={() => setStep("compose")} className="text-sm text-muted-foreground hover:text-ink px-4 py-3">Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}