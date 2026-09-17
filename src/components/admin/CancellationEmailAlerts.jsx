import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import AlertSection from "@/components/admin/AlertSection";

// Loud, unmissable alert for cancelled bookings whose guest confirmation email
// failed to send at cancel time. A guest who cancels and receives nothing may
// assume the cancellation failed and contact their bank — so a failed send is
// surfaced here with the guest's details and a one-click resend, not buried in
// the email log. Clears automatically once a resend succeeds (the flag flips).
export default function CancellationEmailAlerts({ onCount }) {
  const [bookings, setBookings] = useState([]);
  const [sending, setSending] = useState(null);

  const load = useCallback(async () => {
    try {
      const bs = await base44.entities.Booking.list("-updated_date", 500);
      setBookings((bs || []).filter(
        (b) => b.status === "cancelled" && b.cancellation_email_sent !== true
      ));
    } catch {
      setBookings([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { onCount?.(bookings.length); }, [bookings, onCount]);

  const resend = async (id) => {
    setSending(id);
    try {
      const res = await base44.functions.invoke("resendCancellationEmail", { booking_id: id });
      const r = res?.data ?? res;
      if (r?.ok) await load();
    } finally {
      setSending(null);
    }
  };

  return (
    <AlertSection title="Cancellation confirmations not sent" count={bookings.length} tone="problem">
      <p className="text-sm text-white/60 mb-4">
        These bookings were cancelled and refunded, but the guest confirmation email failed to send. Resend so the guest isn't left without confirmation.
      </p>
      <ul className="divide-y divide-white/10">
        {bookings.map((b) => (
          <li key={b.id} className="py-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              <span className="text-white font-medium">{b.guest_name}</span>
              <span className="text-white/50">
                {" "}· {b.guest_email || "no email"} · arriving {b.arrival_date} · ref {b.id}
              </span>
              <span className="text-white/50">
                {" "}· refund £{(Number(b.refund_paid) || 0).toFixed(2)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => resend(b.id)}
              disabled={sending === b.id}
              className="bg-signal text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 min-h-[40px]"
            >
              {sending === b.id ? "Sending…" : "Resend email"}
            </button>
          </li>
        ))}
      </ul>
    </AlertSection>
  );
}