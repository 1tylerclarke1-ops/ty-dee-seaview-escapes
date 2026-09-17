import { useEffect, useState, useCallback } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { base44 } from "@/api/base44Client";
import { gbp } from "@/lib/pricing";
import BlockedCalendar from "@/components/admin/BlockedCalendar";

const REASONS = [
  { value: "owner_use", label: "Owner use" },
  { value: "maintenance", label: "Maintenance" },
  { value: "booked_elsewhere", label: "Booked elsewhere" },
  { value: "other", label: "Other" },
];
const reasonLabel = (v) => REASONS.find((r) => r.value === v)?.label || v;
const gbpMoney = (n) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });

const fmt = (iso) => {
  try { return format(parseISO(iso), "EEE d MMM yyyy"); } catch { return iso; }
};
const nightsBetween = (start, end) => differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;

const EMPTY = { start_date: "", end_date: "", reason: "owner_use", notes: "", id: null };

export default function BlockedDatesManager() {
  const [blocks, setBlocks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    base44.functions
      .invoke("manageBlockedDates", { action: "list" })
      .then((res) => {
        const d = res.data || res;
        setBlocks(d.blocks || []);
        setBookings(d.bookings || []);
      })
      .catch(() => setError("Could not load blocked dates. Are you signed in as admin?"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  // Auto-preview when both dates are set and valid.
  useEffect(() => {
    if (!form.start_date || !form.end_date || form.start_date > form.end_date) {
      setPreview(null);
      return;
    }
    let live = true;
    setPreviewing(true);
    base44.functions
      .invoke("manageBlockedDates", {
        action: "preview",
        start_date: form.start_date,
        end_date: form.end_date,
        exclude_id: form.id,
      })
      .then((res) => { if (live) setPreview(res.data || res); })
      .catch(() => { if (live) setPreview(null); })
      .finally(() => { if (live) setPreviewing(false); });
    return () => { live = false; };
  }, [form.start_date, form.end_date, form.id]);

  const reset = () => { setForm(EMPTY); setPreview(null); setError(null); };

  const save = async (force) => {
    setSaving(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("manageBlockedDates", {
        action: "save",
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
        notes: form.notes,
        id: form.id,
        force,
      });
      const d = res.data || res;
      if (d.error) {
        setError(d.error);
        return;
      }
      setToast(force === "merge" ? "Merged into existing block" : form.id ? "Block updated" : "Dates blocked");
      setTimeout(() => setToast(null), 3000);
      reset();
      load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this block? The dates will become available again.")) return;
    try {
      await base44.functions.invoke("manageBlockedDates", { action: "delete", id });
      load();
    } catch (e) {
      setError(e?.message || "Could not delete");
    }
  };

  const edit = (b) => {
    setForm({ start_date: b.start_date, end_date: b.end_date, reason: b.reason, notes: b.notes || "", id: b.id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasBookingConflict = preview?.bookingConflicts?.length > 0;
  const hasBlockOverlap = preview?.blockOverlaps?.length > 0;
  const canSave = form.start_date && form.end_date && form.reason && form.start_date <= form.end_date && !hasBookingConflict && !saving;

  return (
    <div className="space-y-8">
      {/* At-a-glance calendar */}
      <BlockedCalendar blocks={blocks} bookings={bookings} months={4} />

      {/* Form */}
      <div className="border border-white/10 p-5 md:p-6">
        <h3 className="text-lg text-white mb-1">{form.id ? "Edit block" : "Block dates"}</h3>
        <p className="text-xs text-white/40 mb-5">Dates are inclusive of both start and end. A guest sees "not available" — never the reason.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Start date">
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full bg-white/5 border border-white/15 text-white px-3 py-2 text-sm" />
          </Field>
          <Field label="End date">
            <input type="date" value={form.end_date} min={form.start_date || undefined} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="w-full bg-white/5 border border-white/15 text-white px-3 py-2 text-sm" />
          </Field>
          <Field label="Reason">
            <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full bg-white/5 border border-white/15 text-white px-3 py-2 text-sm">
              {REASONS.map((r) => <option key={r.value} value={r.value} className="bg-ink">{r.label}</option>)}
            </select>
          </Field>
          <Field label="Notes (optional)">
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Admin only — guests never see this"
              className="w-full bg-white/5 border border-white/15 text-white px-3 py-2 text-sm" />
          </Field>
        </div>

        {/* Preview panel */}
        {form.start_date && form.end_date && form.start_date <= form.end_date && (
          <div className="mt-5 space-y-4">
            {/* Cost estimate */}
            {preview && !previewing && (
              <div className="bg-white/5 border border-white/10 p-4">
                <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Estimated net contribution at risk</p>
                <p className="text-xs text-white/40 mb-4">An estimate — max non-overlapping stays at current rates, adjusted by seasonal occupancy, less £80 cleaning per booking.</p>
                <div className="grid sm:grid-cols-3 gap-4 mb-4">
                  <Stat label="Nights blocked" value={nightsBetween(form.start_date, form.end_date)} />
                  <Stat label="Max stays that could fit" value={preview.cost?.stayCount ?? 0} />
                  <Stat label="Est. net at risk" value={gbpMoney(preview.cost?.netContribution ?? 0)} />
                </div>
                {preview.cost?.stayCount > 0 && (
                  <div className="space-y-1 text-sm text-white/60 border-t border-white/10 pt-3">
                    <div className="flex justify-between"><span>Gross at full occupancy</span><span className="tnum text-white">{gbpMoney(preview.cost.grossRevenue)}</span></div>
                    <div className="flex justify-between">
                      <span>Occupancy assumption</span>
                      <span className="tnum text-white">{preview.cost.occupancyAssumptions.map((a) => `${a.season} ${Math.round(a.occupancy * 100)}%`).join(", ")}</span>
                    </div>
                    <div className="flex justify-between"><span>Occupancy-weighted revenue</span><span className="tnum text-white">{gbpMoney(preview.cost.occupancyRevenue)}</span></div>
                    <div className="flex justify-between"><span>Cleaning ({preview.cost.stayCount} × £80)</span><span className="tnum text-white">−{gbpMoney(preview.cost.cleaningTotal)}</span></div>
                    <div className="flex justify-between border-t border-white/10 pt-1"><span className="text-white">Net contribution</span><span className="tnum text-white font-medium">{gbpMoney(preview.cost.netContribution)}</span></div>
                  </div>
                )}
                {preview.cost?.stayCount === 0 && (
                  <p className="text-xs text-white/40">
                    No bookable stays fall in this range — these dates are outside the seasons or not arrival days.
                  </p>
                )}
              </div>
            )}
            {previewing && (
              <p className="text-sm text-white/50 flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin inline-block" />
                Checking conflicts…
              </p>
            )}

            {/* Booking conflicts — refuse */}
            {hasBookingConflict && (
              <div className="border border-red-500/40 bg-red-500/10 p-4">
                <p className="text-sm text-red-300 font-medium mb-2">Cannot block — overlaps a paid booking</p>
                <ul className="space-y-1">
                  {preview.bookingConflicts.map((b) => (
                    <li key={b.id} className="text-sm text-white/70 tnum">
                      {b.guest_name} · arriving {fmt(b.arrival_date)}, {b.nights} nights · {b.status} · ref {b.reference}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-white/40 mt-2">You must never block dates a guest has paid for. Cancel or move the booking first.</p>
              </div>
            )}

            {/* Block overlaps — warn, merge/replace */}
            {hasBlockOverlap && !hasBookingConflict && (
              <div className="border border-signal/40 bg-signal/10 p-4">
                <p className="text-sm text-signal font-medium mb-2">Overlaps an existing block</p>
                <ul className="space-y-1 mb-3">
                  {preview.blockOverlaps.map((b) => (
                    <li key={b.id} className="text-sm text-white/70 tnum">
                      {fmt(b.start_date)} – {fmt(b.end_date)} · {reasonLabel(b.reason)} · {nightsBetween(b.start_date, b.end_date)} nights
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-white/50 mb-3">Merge to combine into one range, or replace to delete the old block(s) and save this one.</p>
                <div className="flex flex-wrap gap-3">
                  <button type="button" disabled={saving} onClick={() => save("merge")}
                    className="bg-signal text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 min-h-[44px]">
                    Merge into existing
                  </button>
                  <button type="button" disabled={saving} onClick={() => save("replace")}
                    className="border border-signal/50 text-signal px-5 py-2.5 text-sm font-medium hover:bg-signal/10 disabled:opacity-50 min-h-[44px]">
                    Replace existing
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-300 mt-4">{error}</p>}

        {/* Save / cancel — only when no block overlap (overlap shows its own buttons) */}
        {!hasBlockOverlap && (
          <div className="flex flex-wrap gap-3 mt-5">
            <button type="button" disabled={!canSave} onClick={() => save()}
              className="bg-sea text-white px-6 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40 min-h-[44px]">
              {saving ? "Saving…" : form.id ? "Update block" : "Block these dates"}
            </button>
            {form.id && (
              <button type="button" onClick={reset}
                className="border border-white/20 text-white/70 px-5 py-2.5 text-sm hover:bg-white/5 min-h-[44px]">
                Cancel edit
              </button>
            )}
          </div>
        )}
        {toast && <p className="text-sm text-sea mt-3">{toast}</p>}
      </div>

      {/* Existing blocks list */}
      <div>
        <h3 className="text-lg text-white mb-4">Existing blocks</h3>
        {loading ? (
          <p className="text-sm text-white/50">Loading…</p>
        ) : blocks.length === 0 ? (
          <p className="text-sm text-white/50">No blocked dates yet.</p>
        ) : (
          <div className="space-y-2">
            {blocks.map((b) => (
              <div key={b.id} className="border border-white/10 p-4 flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="text-white tnum">{fmt(b.start_date)} – {fmt(b.end_date)}</p>
                  <p className="text-xs text-white/50 mt-1">
                    {nightsBetween(b.start_date, b.end_date)} nights · {reasonLabel(b.reason)}
                    {b.notes && <> · {b.notes}</>}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => edit(b)} className="text-sea hover:underline text-sm">Edit</button>
                  <button type="button" onClick={() => remove(b.id)} className="text-red-300 hover:underline text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-white/50 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-white/40 uppercase tracking-wide">{label}</p>
      <p className="text-xl text-white tnum mt-1">{value}</p>
    </div>
  );
}