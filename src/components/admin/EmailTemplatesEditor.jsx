import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { TEMPLATE_TYPES, DEFAULT_TEMPLATES, MERGE_FIELDS } from "@/lib/emailTemplatesClient";

// Admin editor for the five email templates. Subject + body are editable; the
// body uses {{merge_fields}}. Defaults are seeded server-side; if a template
// is missing it is created from the seeded default on first save.
export default function EmailTemplatesEditor() {
  const [templates, setTemplates] = useState([]);
  const [active, setActive] = useState("late_availability");
  const [draft, setDraft] = useState({ subject: "", body: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.EmailTemplate.list(null, 100);
      setTemplates(res || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = templates.find((x) => x.type === active);
    if (t) {
      setDraft({ subject: t.subject, body: t.body });
    } else {
      const d = DEFAULT_TEMPLATES.find((x) => x.type === active);
      setDraft({ subject: d?.subject || "", body: d?.body || "" });
    }
  }, [active, templates]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const existing = templates.find((x) => x.type === active);
      const meta = TEMPLATE_TYPES.find((x) => x.id === active);
      if (existing) {
        await base44.entities.EmailTemplate.update(existing.id, {
          subject: draft.subject, body: draft.body,
        });
      } else {
        await base44.entities.EmailTemplate.create({
          type: active, name: meta?.name || active,
          subject: draft.subject, body: draft.body, is_default: false,
        });
      }
      setMsg("Saved.");
      await load();
    } catch {
      setMsg("Could not save. Are you signed in as admin?");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-white/50">Loading templates…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {TEMPLATE_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-4 py-2 text-sm transition-colors min-h-[44px] ${
              active === t.id
                ? "bg-sea text-white"
                : "bg-white/5 text-white/70 hover:text-white border border-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-xs tracking-wide uppercase text-white/50 block mb-2">Subject</label>
          <input
            type="text"
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            className="w-full bg-transparent border-b border-white/20 py-3 text-white focus:outline-none focus:border-sea min-h-[44px]"
          />
        </div>
        <div>
          <label className="text-xs tracking-wide uppercase text-white/50 block mb-2">Body</label>
          <textarea
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            rows={16}
            className="w-full bg-white/5 border border-white/10 p-4 text-white text-sm font-mono focus:outline-none focus:border-sea resize-y min-h-[160px]"
          />
        </div>
        <div>
          <p className="text-xs tracking-wide uppercase text-white/50 mb-2">Merge fields</p>
          <div className="flex flex-wrap gap-2">
            {MERGE_FIELDS.map((f) => (
              <code key={f} className="text-xs text-white/60 bg-white/5 px-2 py-1">{`{{${f}}}`}</code>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="bg-sea text-white px-6 py-3 text-sm font-medium hover:bg-sea-deep min-h-[44px] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save template"}
          </button>
          {msg && <span className="text-sm text-white/60">{msg}</span>}
        </div>
      </div>
    </div>
  );
}