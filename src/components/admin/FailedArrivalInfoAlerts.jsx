import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Prominently flags confirmed bookings whose arrival info email failed to
// send. A guest who arrives without the lockbox code will ring the owner —
// so failures surface here with the booking, the error, and a one-click
// retry. Clears automatically once the retry succeeds (the flag is cleared
// in sendArrivalInfoForBooking on a successful send).
export default function FailedArrivalInfoAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const bookings = await base44.entities.Booking.filter(
        { arrival_info_send_failed: true },
        "-arrival_date",
        50
      );
      const confirmed = (bookings || []).filter((b) => b.status === "confirmed");
      setAlerts(confirmed);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const retryAll = async () => {
    setRetrying(true);
    try {
      for (const b of alerts) {
        await base44.functions.invoke("sendArrivalInfo", { booking_id: b.id });
      }
      await load();
    } finally {
      setRetrying(false);
    }
  };

  if (loading) return <p className="text-white/40 text-sm mb-6">Checking arrival info sends…</p>;
  if (alerts.length === 0) return null;

  return (
    <div className="mb-10 border border-signal/50 bg-signal/10 p-6 md:p-8">
      <p className="text-sm text-signal uppercase tracking-wide">Action needed</p>
      <h2 className="text-2xl md:text-3xl text-white mt-1">
        {alerts.length} arrival info {alerts.length === 1 ? "email failed to send" : "emails failed to send"}
      </h2>
      <p className="text-sm text-white/60 mt-2 mb-6">
        A guest who arrives without the lockbox code will ring you. Retry now to send the arrival details.
      </p>
      <ul className="divide-y divide-white/10">
        {alerts.map((b) => (
          <li key={b.id} className="py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <div className="min-w-0">
                <span className="text-white font-medium">{b.guest_name || "Unknown"}</span>
                <span className="text-white/50">
                  {" "}· {b.guest_email || "no email"} · ref {b.reference || "—"}
                </span>
                <span className="text-white/50">
                  {" "}· arriving {b.arrival_date}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-signal">Arrival info failed</p>
                <p className="text-xs text-white/40">{b.arrival_info_error || "Unknown error"}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={retryAll}
        disabled={retrying}
        className="mt-4 bg-signal text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 min-h-[40px]"
      >
        {retrying ? "Retrying…" : "Retry all arrival info now"}
      </button>
    </div>
  );
}