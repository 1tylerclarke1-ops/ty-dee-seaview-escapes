import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Owner-only editor for the four dynamic values in the arrival info email:
// WiFi network, WiFi password, lockbox code, and lockbox location. Everything
// else in the email is fixed template wording. The lockbox code is read at
// SEND TIME — never hardcoded — so changing it between guests takes effect
// on the next send (daily job or manual resend).
const DEFAULT_FORM = {
  lockbox_location: "",
  lockbox_code: "",
  wifi_network: "",
  wifi_password: "",
};

const FIELDS = [
  { key: "lockbox_location", label: "Lockbox location (where to find it)" },
  { key: "lockbox_code", label: "Lockbox code (read at send time)" },
  { key: "wifi_network", label: "WiFi network" },
  { key: "wifi_password", label: "WiFi password" },
];

export default function ArrivalInfoSettingsEditor() {
  const [recordId, setRecordId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    base44.entities.ArrivalInfoSettings.list()
      .then((rows) => {
        if (rows && rows.length > 0) {
          const r = rows[0];
          setRecordId(r.id);
          const merged = { ...DEFAULT_FORM };
          for (const k of Object.keys(DEFAULT_FORM)) {
            if (r[k] != null && r[k] !== "") merged[k] = r[k];
          }
          setForm(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      if (recordId) {
        const updated = await base44.entities.ArrivalInfoSettings.update(recordId, form);
        setRecordId(updated.id);
      } else {
        const created = await base44.entities.ArrivalInfoSettings.create(form);
        setRecordId(created.id);
      }
      setMsg("Saved — the next arrival info send will use these values.");
    } catch {
      setMsg("Could not save — sign in as admin to edit these settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-white/50">Loading arrival info settings…</p>;

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-8">
      <p className="text-sm text-white/60 max-w-xl">
        These four values drive the arrival info email — sent to fully-paid guests arriving
        within 3 days. The lockbox code is read at send time, so change it here between guests
        and the next send picks it up automatically. Everything else in the email is fixed
        wording.
      </p>

      <div className="space-y-6">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="text-xs tracking-wide uppercase text-white/50 block mb-2">{f.label}</label>
            <input
              type="text"
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className="w-full bg-transparent border-b border-white/30 py-3 text-white focus:outline-none focus:border-sea min-h-[44px]"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-6">
        <button
          type="submit"
          disabled={saving}
          className="bg-sea text-white px-6 py-3 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {msg && <span className="text-sm text-white/70">{msg}</span>}
      </div>
    </form>
  );
}