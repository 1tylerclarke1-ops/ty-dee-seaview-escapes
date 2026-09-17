import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { base44 } from "@/api/base44Client";
import { gbpMoney } from "@/lib/pricing";

// Day 55 prompt: surfaces bookings flagged for the owner to text the guest
// personally. Shows the guest's name, mobile number (if on file) and a
// suggested message. No auto-send — the owner texts from their own phone.
export default function TextReminderAlerts() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    base44.entities.Booking
      .filter({ text_reminder_flagged: true, status: "deposit_paid" }, "-arrival_date", 50)
      .then((rows) => setBookings(rows || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return null;
  if (!bookings.length) return null;

  return (
    <div className="border border-sea/40 bg-sea/10 p-5 mb-8">
      <h2 className="text-xl text-white mb-1">Text the guest</h2>
      <p className="text-sm text-white/50 mb-4">
        These bookings are overdue and flagged for a personal text. The guest's mobile and a suggested message are below — text from your own phone.
      </p>
      {bookings.map((b) => {
        const balanceOwed = Math.max(
          (b.gross_revenue || 0) - (b.deposit_paid || 0) - (b.balance_paid || 0), 0
        );
        const arrival = b.arrival_date ? format(parseISO(b.arrival_date), "d MMM") : "—";
        const phone = b.text_reminder_phone || null;
        const suggested = `Hi ${b.guest_name || ""}, it's Ty Dee Seaview Escapes. Your balance of ${gbpMoney(balanceOwed)} for your stay arriving ${arrival} is overdue — please pay via your booking link or give us a call. Thanks!`;
        return (
          <div key={b.id} className="border-t border-white/10 pt-3 mt-3 first:border-0 first:mt-0 first:pt-0">
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div className="flex-1 min-w-[200px]">
                <p className="text-white font-medium">{b.guest_name}</p>
                <p className="text-xs text-white/40 tnum">
                  Ref {b.reference} · arriving {b.arrival_date ? format(parseISO(b.arrival_date), "d MMM yyyy") : "—"}
                </p>
                <p className="text-sm text-white/60 tnum mt-1">
                  Balance owed: {gbpMoney(balanceOwed)}
                </p>
                {phone ? (
                  <p className="text-sm text-white mt-2">
                    <span className="text-white/50">Mobile: </span>
                    <a href={`sms:${phone}`} className="text-sea underline tnum">{phone}</a>
                  </p>
                ) : (
                  <p className="text-sm text-signal mt-2">No mobile on file — check the guest list</p>
                )}
                <div className="mt-3 border border-white/10 bg-ink/40 p-3">
                  <p className="text-xs text-white/40 mb-1">Suggested message:</p>
                  <p className="text-sm text-white/80 leading-relaxed">{suggested}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}