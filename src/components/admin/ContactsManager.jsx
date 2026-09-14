import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { gbpMoney } from "@/lib/pricing";
import { LIST_FILTERS } from "@/lib/segments";

// The guest list — filterable by segment, with a manual sync that rebuilds
// contacts from every booking. Consent is shown per contact; the sync never
// grants or revokes it.
export default function ContactsManager() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.Contact
      .list("-created_date", 500)
      .then((rows) => setContacts(rows || []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const sync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await base44.functions.invoke("syncContacts", {});
      const d = res.data || res;
      setSyncMsg(`Synced — ${d.created || 0} new, ${d.updated || 0} updated.`);
      load();
    } catch {
      setSyncMsg("Sync failed — are you signed in as admin?");
    } finally {
      setSyncing(false);
    }
  };

  const activeFilter = LIST_FILTERS.find((f) => f.id === filter) || LIST_FILTERS[0];
  const rows = contacts.filter(activeFilter.test);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {LIST_FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-xs transition-colors ${filter === f.id ? "bg-sea text-white" : "bg-white/5 text-white/60 hover:text-white"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={sync} disabled={syncing}
          className="text-sm text-sea hover:underline disabled:opacity-50">
          {syncing ? "Syncing…" : "Sync from bookings"}
        </button>
      </div>

      {syncMsg && <p className="text-xs text-white/50">{syncMsg}</p>}

      {loading ? (
        <p className="text-sm text-white/50">Loading contacts…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-white/50">No contacts in this segment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs tracking-wide uppercase text-white/40 border-b border-white/10">
                <th className="py-2 pr-4 font-normal">Name</th>
                <th className="py-2 pr-4 font-normal">Email</th>
                <th className="py-2 pr-4 font-normal">Source</th>
                <th className="py-2 pr-4 font-normal text-right">Stays</th>
                <th className="py-2 pr-4 font-normal text-right">Spent</th>
                <th className="py-2 pr-4 font-normal">Consent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="py-3 pr-4 text-white">{c.name || "—"}</td>
                  <td className="py-3 pr-4 text-white/70">{c.email}</td>
                  <td className="py-3 pr-4 text-white/60">{c.source}</td>
                  <td className="py-3 pr-4 text-white/70 text-right tnum">{c.stays_count || 0}</td>
                  <td className="py-3 pr-4 text-white/70 text-right tnum">{gbpMoney(c.total_spent || 0)}</td>
                  <td className="py-3 pr-4">
                    {c.unsubscribed ? <span className="text-signal">Unsubscribed</span>
                      : c.marketing_consent ? <span className="text-sea">Consented</span>
                      : <span className="text-white/40">No consent</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}