import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Owner-only editor for the arrival info email content. Every field here is
// read at SEND TIME — the lockbox code is never hardcoded, so changing it
// between guests takes effect immediately on the next send (daily job or
// manual). The {{park_map}} placeholder in the dog fields becomes a
// hyperlinked "park map" pointing to the Find Us page.
const DEFAULT_FORM = {
  check_in_time: "3:00 PM",
  check_out_time: "10:00 AM",
  park_address: "",
  park_postcode: "",
  directions_brief: "",
  steep_road_note: "Please note the site road is steep.",
  parking_info: "",
  lockbox_location: "",
  lockbox_code: "",
  wifi_network: "",
  wifi_password: "",
  contact_number: "",
  departure_instructions: "On departure, please put all rubbish in the bins, return the keys to the lockbox, and leave the van tidy.",
  dog_bring_items: "Their bed or blanket, bowls, food and any medication, an old towel for wet dogs, a washable throw for the sofa, a long line for the cliff paths, and plenty of poo bags.",
  dog_waste_note: "The park has bins throughout, including two within a few steps of the van, marked with a purple bin icon on the {{park_map}}.",
  dog_walking_note: "There is a dog walking area on the park — see the {{park_map}}.",
  dog_house_rules: "Dogs must not be left alone in the van and must not go on the beds.",
};

const FIELDS = [
  { key: "check_in_time", label: "Check-in time", type: "text" },
  { key: "check_out_time", label: "Check-out time", type: "text" },
  { key: "park_address", label: "Park address", type: "text" },
  { key: "park_postcode", label: "Park postcode", type: "text" },
  { key: "directions_brief", label: "Directions in brief", type: "textarea" },
  { key: "steep_road_note", label: "Steep road note", type: "text" },
  { key: "parking_info", label: "Where to park", type: "textarea" },
  { key: "lockbox_location", label: "Lockbox location", type: "text" },
  { key: "lockbox_code", label: "Lockbox code (read at send time)", type: "text" },
  { key: "wifi_network", label: "WiFi network", type: "text" },
  { key: "wifi_password", label: "WiFi password", type: "text" },
  { key: "contact_number", label: "Contact number (for the day)", type: "text" },
  { key: "departure_instructions", label: "Departure instructions (bins, keys, etc.)", type: "textarea" },
];

const DOG_FIELDS = [
  { key: "dog_bring_items", label: "What to bring", type: "textarea" },
  { key: "dog_waste_note", label: "Waste (use {{park_map}} for the link)", type: "textarea" },
  { key: "dog_walking_note", label: "Walking (use {{park_map}} for the link)", type: "textarea" },
  { key: "dog_house_rules", label: "House rules", type: "textarea" },
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

  const renderField = (f) => (
    <div key={f.key}>
      <label className="text-xs tracking-wide uppercase text-white/50 block mb-2">{f.label}</label>
      {f.type === "textarea" ? (
        <textarea
          value={form[f.key]}
          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
          rows={3}
          className="w-full bg-transparent border-b border-white/30 py-3 text-white focus:outline-none focus:border-sea"
        />
      ) : (
        <input
          type="text"
          value={form[f.key]}
          onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
          className="w-full bg-transparent border-b border-white/30 py-3 text-white focus:outline-none focus:border-sea min-h-[44px]"
        />
      )}
    </div>
  );

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-8">
      <p className="text-sm text-white/60 max-w-xl">
        These drive the arrival info email — sent to fully-paid guests arriving within 3 days.
        The lockbox code is read at send time, so change it here between guests and the next send
        picks it up automatically. In the dog fields, type <code className="text-sea">{"{{park_map}}"}</code> where you want a link to the Find Us page.
      </p>

      <div className="space-y-6">{FIELDS.map(renderField)}</div>

      <div className="pt-4 border-t border-white/10">
        <h3 className="text-sm tracking-wide uppercase text-white/50 mb-4">Dog section (only shown when the booking has dogs)</h3>
        <div className="space-y-6">{DOG_FIELDS.map(renderField)}</div>
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