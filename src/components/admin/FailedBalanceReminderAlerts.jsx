import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import AlertSection from "@/components/admin/AlertSection";

// Shows balance reminder emails that failed to send and haven't been
// successfully retried. A guest who never got a reminder and then gets flagged
// overdue is a complaint — so failures are surfaced here with the booking,
// the stage, and the error, with a one-click retry. Clears automatically once
// the retry succeeds (the stage lands in balance_reminders_sent).
export default function FailedBalanceReminderAlerts({ onCount }) {
  const [alerts, setAlerts] = useState([]);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    try {
      const logs = await base44.entities.EmailLog.filter({ status: "failed" }, "-sent_at", 200);
      const reminderLogs = (logs || []).filter(
        (l) => l.template && l.template.startsWith("balance_reminder_") && l.booking_id
      );
      if (!reminderLogs.length) { setAlerts([]); return; }

      // Most recent failure per booking+stage
      const byKey = new Map();
      for (const l of reminderLogs) {
        const stage = l.template.replace("balance_reminder_", "");
        const key = `${l.booking_id}:${stage}`;
        if (!byKey.has(key) || new Date(l.sent_at) > new Date(byKey.get(key).sent_at)) {
          byKey.set(key, { ...l, stage });
        }
      }

      // Fetch bookings to check if the stage was eventually sent
      const bookingIds = [...new Set([...byKey.values()].map((l) => l.booking_id))];
      const bookings = await Promise.all(
        bookingIds.map((id) => base44.entities.Booking.get(id).catch(() => null))
      );
      const bookingMap = new Map(bookings.filter(Boolean).map((b) => [b.id, b]));

      // Only show failures where the stage is still missing and the booking is still deposit_paid
      const outstanding = [...byKey.values()].filter((l) => {
        const b = bookingMap.get(l.booking_id);
        if (!b || b.status !== "deposit_paid") return false;
        const sent = b.balance_reminders_sent || [];
        return !sent.includes(l.stage);
      }).map((l) => ({ ...l, booking: bookingMap.get(l.booking_id) }));

      setAlerts(outstanding);
    } catch {
      setAlerts([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { onCount?.(alerts.length); }, [alerts, onCount]);

  const retryAll = async () => {
    setRetrying(true);
    try {
      await base44.functions.invoke("sendBalanceReminders", {});
      await load();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <AlertSection title="Balance reminder emails failed to send" count={alerts.length} tone="problem">
      <p className="text-sm text-white/60 mb-4">
        These reminder emails failed and the guest hasn't received them. Retry now, or the next daily run will retry automatically.
      </p>
      <ul className="divide-y divide-white/10">
        {alerts.map((a) => (
          <li key={`${a.booking_id}:${a.stage}`} className="py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <div className="min-w-0">
                <span className="text-white font-medium">{a.booking?.guest_name || "Unknown"}</span>
                <span className="text-white/50">
                  {" "}· {a.booking?.guest_email || "no email"} · ref {a.booking?.reference || a.booking_id}
                </span>
                <span className="text-white/50">
                  {" "}· arriving {a.booking?.arrival_date}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-signal">{a.stage}-day reminder failed</p>
                <p className="text-xs text-white/40">{a.error || "Unknown error"}</p>
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
        {retrying ? "Retrying…" : "Retry all reminders now"}
      </button>
    </AlertSection>
  );
}