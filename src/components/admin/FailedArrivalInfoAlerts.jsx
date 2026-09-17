import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import AlertSection from "@/components/admin/AlertSection";

// Prominently flags confirmed bookings whose arrival info email failed to
// send. A guest who arrives without the lockbox code will ring the owner —
// so failures surface here with the booking, the error, and a one-click
// retry. Clears automatically once the retry succeeds (the flag is cleared
// in sendArrivalInfoForBooking on a successful send).
export default function FailedArrivalInfoAlerts({ onCount }) {
  const [alerts, setAlerts] = useState([]);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { onCount?.(alerts.length); }, [alerts, onCount]);

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

  return (
    <AlertSection title="Arrival info emails failed to send" count={alerts.length} tone="problem">
      <p className="text-sm text-white/60 mb-4">
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
    </AlertSection>
  );
}