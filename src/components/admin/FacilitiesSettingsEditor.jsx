import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { DEFAULT_FACILITIES_SETTINGS } from "@/lib/facilities";

// Owner-only editor for the facilities disclosure settings. These drive
// every facilities surface on the site (per-season status, availability
// marker, booking panel, checkout tickbox, confirmation email). The closed
// window repeats annually from the month/day set here.
export default function FacilitiesSettingsEditor() {
  const [recordId, setRecordId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FACILITIES_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    base44.entities.FacilitiesSettings.list()
      .then((rows) => {
        if (rows && rows.length > 0) {
          const r = rows[0];
          setRecordId(r.id);
          setForm({
            facilities_closed_from: r.facilities_closed_from || DEFAULT_FACILITIES_SETTINGS.facilities_closed_from,
            facilities_open_from: r.facilities_open_from || DEFAULT_FACILITIES_SETTINGS.facilities_open_from,
            facilities_list: r.facilities_list || "",
            facilities_winter_note: r.facilities_winter_note || "",
          });
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
      const payload = {
        facilities_closed_from: form.facilities_closed_from,
        facilities_open_from: form.facilities_open_from,
        facilities_list: form.facilities_list,
        facilities_winter_note: form.facilities_winter_note,
      };
      if (recordId) {
        const updated = await base44.entities.FacilitiesSettings.update(recordId, payload);
        setRecordId(updated.id);
      } else {
        const created = await base44.entities.FacilitiesSettings.create(payload);
        setRecordId(created.id);
      }
      setMsg("Saved — the site now uses these dates.");
    } catch (err) {
      setMsg("Could not save — sign in as admin to edit these settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-white/50">Loading facilities settings…</p>;
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-8">
      <p className="text-sm text-white/60 max-w-xl">
        These drive every facilities disclosure on the site — the per-season status, the availability marker, the booking panel and the compulsory checkout tickbox. They repeat annually from the month/day you set, so roll the dates forward each year.
      </p>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="text-xs tracking-wide uppercase text-white/50 block mb-2">Facilities closed from</label>
          <input
            type="date"
            value={form.facilities_closed_from}
            onChange={(e) => setForm({ ...form, facilities_closed_from: e.target.value })}
            className="w-full bg-transparent border-b border-white/30 py-3 text-white focus:outline-none focus:border-sea min-h-[44px] tnum"
          />
        </div>
        <div>
          <label className="text-xs tracking-wide uppercase text-white/50 block mb-2">Facilities open from</label>
          <input
            type="date"
            value={form.facilities_open_from}
            onChange={(e) => setForm({ ...form, facilities_open_from: e.target.value })}
            className="w-full bg-transparent border-b border-white/30 py-3 text-white focus:outline-none focus:border-sea min-h-[44px] tnum"
          />
        </div>
      </div>

      <div>
        <label className="text-xs tracking-wide uppercase text-white/50 block mb-2">Facilities list (when open)</label>
        <textarea
          value={form.facilities_list}
          onChange={(e) => setForm({ ...form, facilities_list: e.target.value })}
          rows={3}
          className="w-full bg-transparent border-b border-white/30 py-3 text-white focus:outline-none focus:border-sea"
        />
      </div>

      <div>
        <label className="text-xs tracking-wide uppercase text-white/50 block mb-2">Winter note (shown for closed dates)</label>
        <textarea
          value={form.facilities_winter_note}
          onChange={(e) => setForm({ ...form, facilities_winter_note: e.target.value })}
          rows={3}
          className="w-full bg-transparent border-b border-white/30 py-3 text-white focus:outline-none focus:border-sea"
        />
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