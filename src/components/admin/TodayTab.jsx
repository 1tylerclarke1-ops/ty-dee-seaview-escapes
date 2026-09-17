import { useMemo, useState } from "react";
import PitchFeeLine from "@/components/admin/PitchFeeLine";
import NewBookingsAlert from "@/components/admin/NewBookingsAlert";
import UnansweredEnquiriesAlert from "@/components/admin/UnansweredEnquiriesAlert";
import BalanceOverdueAlerts from "@/components/admin/BalanceOverdueAlerts";
import GracePeriodAlerts from "@/components/admin/GracePeriodAlerts";
import CancellationEmailAlerts from "@/components/admin/CancellationEmailAlerts";
import FailedBalanceReminderAlerts from "@/components/admin/FailedBalanceReminderAlerts";
import FailedArrivalInfoAlerts from "@/components/admin/FailedArrivalInfoAlerts";
import TextReminderAlerts from "@/components/admin/TextReminderAlerts";
import AutoCancelUndoAlerts from "@/components/admin/AutoCancelUndoAlerts";

// The default landing view. Only things needing the owner's attention, each
// collapsed to a one-line count that expands on click. The pitch fee tracker
// sits above as a single quiet progress line — context, not a task.
//
// Each alert reports its count up here through a stable onCount callback; the
// Today tab aggregates them so it can show a plain empty state when nothing
// needs attention, instead of rendering nine empty panels. The alert
// components stay mounted (they self-hide via AlertSection when their count is
// zero), so a new booking or enquiry is picked up live.
const ALERT_KEYS = [
  "newBookings",
  "enquiries",
  "balanceOverdue",
  "grace",
  "cancelEmails",
  "failedReminders",
  "failedArrival",
  "textReminders",
  "autoCancel",
];

export default function TodayTab() {
  const [counts, setCounts] = useState({});

  // Stable per-key callbacks so each alert's onCount effect doesn't loop.
  const callbacks = useMemo(() => {
    const cb = {};
    for (const key of ALERT_KEYS) {
      cb[key] = (n) =>
        setCounts((c) => (c[key] === n ? c : { ...c, [key]: n }));
    }
    return cb;
  }, []);

  const reported = Object.keys(counts).length;
  const allReported = reported >= ALERT_KEYS.length;
  const allZero = allReported && ALERT_KEYS.every((k) => !counts[k]);

  return (
    <div>
      <PitchFeeLine />

      {allReported && allZero && (
        <div className="border border-white/10 bg-white/[0.02] px-5 py-10 text-center">
          <p className="text-white/80 text-sm">Nothing needs your attention right now.</p>
          <p className="text-white/40 text-xs mt-1">New bookings, enquiries and reminders will appear here.</p>
        </div>
      )}

      <div className="border-t border-white/10">
        <NewBookingsAlert onCount={callbacks.newBookings} />
        <UnansweredEnquiriesAlert onCount={callbacks.enquiries} />
        <BalanceOverdueAlerts onCount={callbacks.balanceOverdue} />
        <GracePeriodAlerts onCount={callbacks.grace} />
        <CancellationEmailAlerts onCount={callbacks.cancelEmails} />
        <FailedBalanceReminderAlerts onCount={callbacks.failedReminders} />
        <FailedArrivalInfoAlerts onCount={callbacks.failedArrival} />
        <TextReminderAlerts onCount={callbacks.textReminders} />
        <AutoCancelUndoAlerts onCount={callbacks.autoCancel} />
      </div>
    </div>
  );
}