import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { base44 } from "@/api/base44Client";
import { gbpMoney } from "@/lib/pricing";
import OfferComposer from "@/components/admin/OfferComposer";

// The gaps view — the most valuable screen. Every unsold bookable stay in the
// next 30 days with price, net per night after cleaning, days to arrival, the
// ladder rung, and a one-click offer button. Plus orphan gaps between bookings
// that no standard stay length can fill — sold only by hand.
export default function GapsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [composer, setComposer] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    base44.functions
      .invoke("getGapsView", {})
      .then((res) => setData(res.data || res))
      .catch(() => setError("Could not load the gaps view. Are you signed in as admin?"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading) return <p className="text-sm text-white/50">Loading gaps…</p>;
  if (error) return <p className="text-sm text-signal">{error}</p>;
  if (!data) return null;

  const unsold = data.unsold || [];
  const orphans = data.orphans || [];

  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-xl text-white">Unsold stays · next 30 days</h3>
          <p className="text-xs text-white/40 tnum">{unsold.length} bookable stays</p>
        </div>
        {unsold.length === 0 ? (
          <p className="text-sm text-white/50">No unsold stays in the next 30 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide uppercase text-white/40 border-b border-white/10">
                  <th className="py-2 pr-4 font-normal">Arrival</th>
                  <th className="py-2 pr-4 font-normal">Nights</th>
                  <th className="py-2 pr-4 font-normal">Season</th>
                  <th className="py-2 pr-4 font-normal text-right">Price</th>
                  <th className="py-2 pr-4 font-normal text-right">Net/n</th>
                  <th className="py-2 pr-4 font-normal text-right">Days</th>
                  <th className="py-2 pr-4 font-normal">Rung</th>
                  <th className="py-2 pr-4 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {unsold.map((s) => (
                  <tr key={`${s.arrival_date}-${s.nights}`} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-white tnum">{format(parseISO(s.arrival_date), "EEE d MMM")}</td>
                    <td className="py-3 pr-4 text-white/70 tnum">{s.nights}</td>
                    <td className="py-3 pr-4 text-white/70">{s.season}</td>
                    <td className="py-3 pr-4 text-white text-right tnum">{gbpMoney(s.current_price)}</td>
                    <td className="py-3 pr-4 text-white/70 text-right tnum">{gbpMoney(s.net_per_night)}</td>
                    <td className="py-3 pr-4 text-white/70 text-right tnum">{s.days_to_arrival}</td>
                    <td className="py-3 pr-4 text-white/60">
                      {s.protected ? <span className="text-signal">Protected</span> : s.rung_label || "—"}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {s.offer_eligible ? (
                        <button
                          type="button"
                          onClick={() => setComposer(s)}
                          className="text-sea hover:underline text-sm"
                        >
                          Offer
                        </button>
                      ) : (
                        <span className="text-white/30 text-xs">{s.protected ? "" : "monitor"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-xl text-white">Orphan gaps · sell by hand</h3>
          <p className="text-xs text-white/40 tnum">{orphans.length} gaps</p>
        </div>
        {orphans.length === 0 ? (
          <p className="text-sm text-white/50">No orphan gaps between bookings.</p>
        ) : (
          <ul className="space-y-2">
            {orphans.map((g, i) => (
              <li key={i} className="border border-white/10 p-4 flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="text-white tnum">{format(parseISO(g.start_date), "EEE d MMM")} · {g.nights} nights</p>
                  <p className="text-xs text-white/40 mt-1">Between {g.before} and {g.after}</p>
                </div>
                <span className="text-xs text-signal">No standard length fits — sell by hand</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {composer && (
        <OfferComposer stay={composer} onClose={() => setComposer(null)} onSent={() => { setComposer(null); load(); }} />
      )}
    </div>
  );
}