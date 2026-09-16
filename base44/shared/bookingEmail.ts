// The single guest/owner confirmation email template. Both the payment-time
// confirmation (paymentConfirmation.ts) and the admin resend
// (sendBookingConfirmation) call buildGuestConfirmationEmail, so a resend is
// indistinguishable from the original and the two paths can never drift.
//
// Dates are formatted for guests (full day/month names); the cooling-off
// deadline is rounded DOWN to the hour so a guest never overruns the real
// deadline. The owner alert address comes from the OWNER_EMAIL secret
// (Settings → Environment variables), falling back to the owner's personal inbox.

import { secrets } from "base44:runtime";
import { balanceDueIso } from "./pricing.ts";
import {
  stayFacilitiesStatus,
  formatFacilitiesDate,
  addDaysIso,
  DEFAULT_FACILITIES_SETTINGS,
} from "./facilities.ts";

// Owner alert destination — single source of truth across every sender.
// No fallback: a missing OWNER_EMAIL is a configuration error, not a silent
// default. Returns null when unset so callers skip the send and flag it,
// rather than quietly mailing a wrong address. Set it in Settings →
// Environment variables.
export function ownerEmail() {
  const fromSecret = secrets.get("OWNER_EMAIL");
  if (fromSecret && fromSecret.trim()) return fromSecret.trim();
  console.error(
    "[config] OWNER_EMAIL secret is not set — owner alerts cannot be delivered. Set it in Settings → Environment variables."
  );
  return null;
}

const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "Friday 5 February 2027" — full names, UTC (for date-only fields).
export function formatGuestDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00Z");
  return `${DAYS_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Cooling-off deadline rounded DOWN to the hour, Europe/London:
// "12pm on Saturday 18 September 2026". Flooring keeps the stated deadline at
// or before the real one, so a guest who cancels by it is always in time.
export function formatCoolingOffHour(iso) {
  if (!iso) return "";
  const dt = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "numeric", hour12: true,
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).formatToParts(dt);
  const get = (t) => (parts.find((p) => p.type === t) || {}).value || "";
  const hour = get("hour");
  const dayPeriod = (get("dayPeriod") || "").toLowerCase();
  const weekday = get("weekday");
  const day = get("day");
  const month = get("month");
  const year = get("year");
  return `${hour}${dayPeriod} on ${weekday} ${day} ${month} ${year}`;
}

// The guest confirmation email — sent at payment time AND on admin resend.
// `breakdown` is the pricing engine output; `payableInFull` decides deposit vs
// full; `settings` is the FacilitiesSettings row; `coolingOffIso` is the
// cooling-off expiry; `appBaseUrl` is the site origin (for the policy link).
export function buildGuestConfirmationEmail({ booking, breakdown, payableInFull, settings, coolingOffIso, appBaseUrl }) {
  const arrivalLong = formatGuestDate(booking.arrival_date);
  const balanceDueLong = formatGuestDate(balanceDueIso(booking.arrival_date));
  const amountPaid = payableInFull ? breakdown.total : breakdown.deposit;
  const coolingOffHour = coolingOffIso ? formatCoolingOffHour(coolingOffIso) : "";

  const subject = `Your stay at Ty Dee Seaview Escapes is confirmed — arriving ${arrivalLong}`;

  const lines = [
    `Hello ${booking.guest_name || ""},`,
    ``,
    `Your booking is confirmed and your payment of £${amountPaid.toFixed(2)} has been received.`,
    ``,
    `Arriving ${arrivalLong}, ${booking.nights} night(s), ${booking.guests || ""} guest(s).`,
    ``,
  ];
  if (payableInFull) {
    lines.push(`You've paid the full balance — there's nothing further to pay.`);
  } else {
    lines.push(`You've paid your deposit. The balance of £${breakdown.balance.toFixed(2)} is due by ${balanceDueLong} — we'll be in touch nearer the time.`);
  }
  lines.push(``);
  if (coolingOffHour) {
    lines.push(`Change your mind? You have a full refund until ${coolingOffHour} — cancel before then and everything you've paid comes back.`);
  }

  // Facilities note (only when the stay is affected by the winter closure).
  const facStatus = stayFacilitiesStatus(booking.arrival_date, booking.nights, settings || DEFAULT_FACILITIES_SETTINGS);
  if (facStatus.state !== "open") {
    lines.push(``);
    if (facStatus.state === "closed") {
      lines.push(settings?.facilities_winter_note || `The park's on-site facilities are closed for these dates. Your booking is for the accommodation only.`);
    } else if (facStatus.direction === "opening") {
      lines.push(`The park's on-site facilities reopen on ${formatFacilitiesDate(facStatus.boundaryDate)} — your booking is for the accommodation only before then.`);
    } else {
      lines.push(`The park's on-site facilities are open to ${formatFacilitiesDate(addDaysIso(facStatus.boundaryDate, -1))} and closed from ${formatFacilitiesDate(facStatus.boundaryDate)} — your booking is for the accommodation only from then.`);
    }
  }

  // Shortened policy: one summary line + a link to the full terms on the site.
  lines.push(``);
  lines.push(`Full refund until ${balanceDueLong}, then 75%, 50% and none as your arrival approaches. Read the full cancellation policy: ${appBaseUrl}/terms`);
  lines.push(``);
  lines.push(`Ty Dee Seaview Escapes — Polperro, Looe, Cornwall`);

  return { subject, text: lines.join("\n") };
}

// The owner "new booking" alert — sent at payment time AND on admin resend.
export function buildOwnerAlertEmail({ booking, breakdown, payableInFull }) {
  const arrivalLong = formatGuestDate(booking.arrival_date);
  const amountPaid = payableInFull ? breakdown.total : breakdown.deposit;
  const subject = `New booking confirmed & paid — ${booking.guest_name}`;
  const text = `${booking.guest_name} (${booking.guest_email || "no email"}) booked ${arrivalLong} for ${booking.nights} night(s), ${booking.guests} guest(s). Paid £${amountPaid.toFixed(2)}${payableInFull ? " (full)" : " (deposit)"}. Booking ref ${booking.id}.`;
  return { subject, text };
}