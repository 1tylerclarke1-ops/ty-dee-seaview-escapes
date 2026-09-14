import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { DEFAULT_CANCELLATION_POLICY, normalizePolicy, buildPolicyText } from "@/lib/cancellation";

// Owner-only editor for the tiered cancellation policy. Tiers are an ordered
// list (evaluated top-down by days before arrival); the catch-all below the
// lowest tier is always %. season_overrides lets a stricter schedule be
// applied to individual seasons later without restructuring the default tiers.
function TierRows({ tiers, onChange }) {
  const update = (i, field, value) => {
    const next = tiers.map((t, idx) => (idx === i ? { ...t, [field]: Number(value) } : t));
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {tiers.map((t, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-white/40 tnum w-6">{i + 1}.</span>
          <div className="flex-1">
            <label className="text-[0.65rem] tracking-wide uppercase text-white/40 block">Days before arrival (min)</label>
            <input
              type="number"
              min={0}
              value={t.days_before_arrival}
              onChange={(e) => update(i, "days_before_arrival", e.target.value)}
              className="w-full bg-transparent border-b border-white/30 py-2 text-white tnum focus:outline-none focus:border-sea min-h-[40px]"
            />
          </div>
          <div className="flex-1">
            <label className="text-[0.65rem] tracking-wide uppercase text-white/40 block">Refund %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={t.refund_percent}
              onChange={(e) => update(i, "refund_percent", e.target.value)}
              className="w-full bg-transparent border-b border-white/30 py-2 text-white tnum focus:outline-none focus:border-sea min-h-[40px]"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(tiers.filter((_, idx) => idx !== i))}
            className="mt-5 text-xs text-white/50 hover:text-signal"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...tiers, { days_before_arrival: 0, refund_percent: 0 }])}
        className="text-xs text-sea hover:underline"
      >
        + Add tier
      </button>
    </div>
  );
}

export default function CancellationPolicyEditor() {
  const [recordId, setRecordId] = useState(null);
  const [tiers, setTiers] = useState(DEFAULT_CANCELLATION_POLICY.tiers.map((t) => ({ ...t })));
  const [depositRefundable, setDepositRefundable] = useState(true);
  const [seasonOverrides, setSeasonOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    base44.entities.CancellationPolicy.list()
      .then((rows) => {
        if (rows && rows.length) {
          const p = normalizePolicy(rows[0]);
          setRecordId(rows[0].id);
          setTiers(p.tiers.map((t) => ({ ...t })));
          setDepositRefundable(p.deposit_refundable !== false);
          setSeasonOverrides(Array.isArray(rows[0].season_overrides) ? rows[0].season_overrides : []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const sorted = [...tiers].sort((a, b) => b.days_before_arrival - a.days_before_arrival);
    const payload = {
      tiers: sorted,
      season_overrides: seasonOverrides,
      deposit_refundable: depositRefundable,
    };
    try {
      if (recordId) {
        const updated = await base44.entities.CancellationPolicy.update(recordId, payload);
        setRecordId(updated.id);
      } else {
        const created = await base44.entities.CancellationPolicy.create(payload);
        setRecordId(created.id);
      }
      setTiers(sorted);
      setMsg("Saved — the site now uses this cancellation policy.");
    } catch {
      setMsg("Could not save — sign in as admin to edit these settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-white/50">Loading cancellation policy…</p>;

  const previewPolicy = normalizePolicy({ tiers, season_overrides: seasonOverrides, deposit_refundable: depositRefundable });

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-8">
      <p className="text-sm text-white/60 max-w-xl">
        Tiers are evaluated top-down by days before arrival; the first match wins. Anything below the lowest tier is 0%. Refunds are always calculated on money received, so the deposit is refundable within the 100% band.
      </p>

      <div>
        <label className="text-xs tracking-wide uppercase text-white/50 block mb-3">Refund tiers</label>
        <TierRows tiers={tiers} onChange={setTiers} />
      </div>

      <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
        <input
          type="checkbox"
          checked={depositRefundable}
          onChange={(e) => setDepositRefundable(e.target.checked)}
          className="w-5 h-5 accent-sea shrink-0"
        />
        <span className="text-sm text-white/80">Deposit is refundable within the 100% band</span>
      </label>

      <div>
        <label className="text-xs tracking-wide uppercase text-white/50 block mb-3">Per-season overrides (optional)</label>
        {seasonOverrides.length === 0 && (
          <p className="text-xs text-white/40">None set. Add a stricter schedule for an individual season below.</p>
        )}
        <div className="space-y-4">
          {seasonOverrides.map((o, i) => (
            <div key={i} className="border border-white/10 p-4">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Season name (e.g. Peak summer)"
                  value={o.season || ""}
                  onChange={(e) => setSeasonOverrides(seasonOverrides.map((x, idx) => (idx === i ? { ...x, season: e.target.value } : x)))}
                  className="flex-1 bg-transparent border-b border-white/30 py-2 text-white focus:outline-none focus:border-sea min-h-[40px]"
                />
                <button type="button" onClick={() => setSeasonOverrides(seasonOverrides.filter((_, idx) => idx !== i))} className="text-xs text-white/50 hover:text-signal">Remove</button>
              </div>
              <TierRows
                tiers={Array.isArray(o.tiers) ? o.tiers : []}
                onChange={(next) => setSeasonOverrides(seasonOverrides.map((x, idx) => (idx === i ? { ...x, tiers: next } : x)))}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSeasonOverrides([...seasonOverrides, { season: "", tiers: [{ days_before_arrival: 60, refund_percent: 100 }] }])}
            className="text-xs text-sea hover:underline"
          >
            + Add season override
          </button>
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <p className="text-xs tracking-wide uppercase text-white/50 mb-2">Policy text preview</p>
        <pre className="text-xs text-white/60 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-auto tydee-scroll">{buildPolicyText(previewPolicy)}</pre>
      </div>

      <div className="flex items-center gap-6">
        <button
          type="submit"
          disabled={saving}
          className="bg-sea text-white px-6 py-3 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save policy"}
        </button>
        {msg && <span className="text-sm text-white/70">{msg}</span>}
      </div>
    </form>
  );
}