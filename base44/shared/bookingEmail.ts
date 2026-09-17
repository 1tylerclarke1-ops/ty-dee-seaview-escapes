// The guest/owner email templates. Every email is sent as multipart — an HTML
// part (hyperlinked words, figures set apart, a prominent primary button) and
// a plain-text fallback for deliverability. No raw URLs ever appear as text in
// the HTML; the plain-text fallback necessarily shows them (there is no other
// way to link in plain text).
//
// The guest confirmation carries two links:
//   • "Manage or cancel your booking" → the booking's tokenised manage page
//     (/booking/<cancel_token>) — the primary call-to-action, shown as a
//     clearly visible button, never buried in a paragraph.
//   • "our cancellation policy" → /terms — an inline hyperlinked phrase.
//
// buildGuestConfirmationEmail is called at payment time (paymentConfirmation)
// and on admin resend (sendBookingConfirmation), so a resend is
// indistinguishable from the original. buildOwnerDigestEmail is shared by the
// daily digest job and the admin test tool. Dates are formatted for guests
// (full day/month names); the cooling-off deadline is rounded DOWN to the
// hour so a guest never overruns the real deadline.

import { secrets } from "base44:runtime";
import { balanceDueIso } from "./pricing.ts";
import {
  stayFacilitiesStatus,
  formatFacilitiesDate,
  addDaysIso,
  DEFAULT_FACILITIES_SETTINGS,
} from "./facilities.ts";
import {
  escapeHtml,
  emailShell,
  figureBox,
  boxLabel,
  figRow,
  buttonLink,
  inlineLink,
  para,
} from "./emailHtml.ts";

// Owner alert destination — single source of truth across every sender.
// No fallback: a missing OWNER_EMAIL is a configuration error, not a silent
// default. Returns null when unset so callers skip the send and flag it.
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

function gbp(n) {
  return `£${Number(n || 0).toFixed(2)}`;
}

// The guest confirmation email — sent at payment time AND on admin resend.
// `breakdown` is the pricing engine output; `payableInFull` decides deposit vs
// full; `settings` is the FacilitiesSettings row; `coolingOffIso` is the
// cooling-off expiry; `appBaseUrl` is the site origin (for the links).
export function buildGuestConfirmationEmail({ booking, breakdown, payableInFull, settings, coolingOffIso, appBaseUrl }) {
  const arrivalLong = formatGuestDate(booking.arrival_date);
  const balanceDueLong = formatGuestDate(balanceDueIso(booking.arrival_date));
  const amountPaid = payableInFull ? breakdown.total : breakdown.deposit;
  const coolingOffHour = coolingOffIso ? formatCoolingOffHour(coolingOffIso) : "";
  const manageUrl = booking.cancel_token ? `${appBaseUrl}/booking/${booking.cancel_token}` : null;
  const policyUrl = `${appBaseUrl}/terms`;

  const subject = `Your stay at Ty Dee Seaview Escapes is confirmed — arriving ${arrivalLong}`;

  // --- Plain-text fallback (URLs shown — unavoidable in plain text) ---
  const lines = [
    `Hello ${booking.guest_name || ""},`,
    ``,
    `Your booking is confirmed and your payment of ${gbp(amountPaid)} has been received.`,
    ``,
    `Booking reference: ${booking.reference}.`,
    `Arriving ${arrivalLong}, ${booking.nights} night(s), ${booking.guests || ""} guest(s).`,
    ``,
  ];
  if (payableInFull) {
    lines.push(`You've paid the full balance — there's nothing further to pay.`);
  } else {
    lines.push(`You've paid your deposit. The balance of ${gbp(breakdown.balance)} is due by ${balanceDueLong} — we'll be in touch nearer the time.`);
  }
  lines.push(``);
  if (coolingOffHour) {
    lines.push(`Change your mind? You have a full refund until ${coolingOffHour} — cancel before then and everything you've paid comes back.`);
    lines.push(``);
  }

  const facStatus = stayFacilitiesStatus(booking.arrival_date, booking.nights, settings || DEFAULT_FACILITIES_SETTINGS);
  if (facStatus.state !== "open") {
    if (facStatus.state === "closed") {
      lines.push(settings?.facilities_winter_note || `The park's on-site facilities are closed for these dates. Your booking is for the accommodation only.`);
    } else if (facStatus.direction === "opening") {
      lines.push(`The park's on-site facilities reopen on ${formatFacilitiesDate(facStatus.boundaryDate)} — your booking is for the accommodation only before then.`);
    } else {
      lines.push(`The park's on-site facilities are open to ${formatFacilitiesDate(addDaysIso(facStatus.boundaryDate, -1))} and closed from ${formatFacilitiesDate(facStatus.boundaryDate)} — your booking is for the accommodation only from then.`);
    }
    lines.push(``);
  }

  if (manageUrl) {
    lines.push(`Manage or cancel your booking: ${manageUrl}`);
  }
  lines.push(`Our cancellation policy: ${policyUrl}`);
  lines.push(``);
  lines.push(`Ty Dee Seaview Escapes — Polperro, Looe, Cornwall`);
  const text = lines.join("\n");

  // --- HTML part (hyperlinked words, figures set apart, prominent button) ---
  const stayRows = [
    boxLabel("Your stay"),
    figRow("Booking ref", booking.reference),
    figRow("Arriving", arrivalLong),
    figRow("Length", `${booking.nights} night(s)`),
    figRow("Guests", `${booking.guests || 0}`),
  ];
  if (booking.dog_count) {
    stayRows.push(figRow("Dogs", `${booking.dog_count}`));
  }

  const payRows = [
    boxLabel("Payment"),
    figRow("Amount paid", gbp(amountPaid)),
  ];
  if (payableInFull) {
    payRows.push(`<p style="margin:0;font-size:14px;line-height:1.5;color:${"#5E6E70"};">Paid in full — nothing further to pay.</p>`);
  } else {
    payRows.push(figRow("Balance due", `${gbp(breakdown.balance)} by ${balanceDueLong}`));
  }

  let body = "";
  body += `<h1 style="margin:0 0 4px;font-size:22px;line-height:1.2;color:#1C2A31;">Your stay is confirmed</h1>`;
  body += `<p style="margin:0 0 20px;font-size:14px;color:#5E6E70;">Ty Dee Seaview Escapes — Polperro, Looe, Cornwall</p>`;
  body += para(`Hello ${escapeHtml(booking.guest_name || "")},`);
  body += para(`Your booking is confirmed and your payment of <strong>${escapeHtml(gbp(amountPaid))}</strong> has been received. We're looking forward to welcoming you.`);
  body += figureBox(stayRows.join(""));
  body += figureBox(payRows.join(""));
  if (coolingOffHour) {
    body += para(`<strong>Change your mind?</strong> You have a full refund until ${escapeHtml(coolingOffHour)} — cancel before then and everything you've paid comes back.`);
  }
  if (facStatus.state !== "open") {
    let facNote;
    if (facStatus.state === "closed") {
      facNote = settings?.facilities_winter_note || `The park's on-site facilities are closed for these dates. Your booking is for the accommodation only.`;
    } else if (facStatus.direction === "opening") {
      facNote = `The park's on-site facilities reopen on ${formatFacilitiesDate(facStatus.boundaryDate)} — your booking is for the accommodation only before then.`;
    } else {
      facNote = `The park's on-site facilities are open to ${formatFacilitiesDate(addDaysIso(facStatus.boundaryDate, -1))} and closed from ${formatFacilitiesDate(facStatus.boundaryDate)} — your booking is for the accommodation only from then.`;
    }
    body += para(escapeHtml(facNote));
  }

  // The primary call-to-action — a clearly visible button, not buried.
  if (manageUrl) {
    body += `<p style="margin:24px 0 12px;">${buttonLink(manageUrl, "Manage or cancel your booking")}</p>`;
  }
  body += para(`Read ${inlineLink(policyUrl, "our cancellation policy")}.`);
  body += `<p style="margin:24px 0 0;font-size:14px;color:#5E6E70;">Ty Dee Seaview Escapes</p>`;

  const html = emailShell({ title: subject, body });

  return { subject, text, html };
}

// The owner "new booking" alert — sent at payment time AND on admin resend.
// Owner-facing, no URLs — plain text only.
export function buildOwnerAlertEmail({ booking, breakdown, payableInFull }) {
  const arrivalLong = formatGuestDate(booking.arrival_date);
  const amountPaid = payableInFull ? breakdown.total : breakdown.deposit;
  const subject = `New booking confirmed & paid — ${booking.guest_name}`;
  const text = `${booking.guest_name} (${booking.guest_email || "no email"}) booked ${arrivalLong} for ${booking.nights} night(s), ${booking.guests} guest(s). Paid ${gbp(amountPaid)}${payableInFull ? " (full)" : " (deposit)"}. Booking ref ${booking.reference}.`;
  return { subject, text };
}

// The daily owner digest email — one email listing every paid booking AND
// every contact-form enquiry not yet digested. Built here (not inline in the
// digest job) so the admin "send test emails" tool renders the exact same
// owner email with a single synthetic booking.
export function buildOwnerDigestEmail({ bookings, enquiries, appBaseUrl }) {
  const bCount = bookings.length;
  const eCount = enquiries.length;
  let subject;
  if (bCount && eCount) {
    subject = `${bCount} new booking${bCount === 1 ? "" : "s"} and ${eCount} new enquiry${eCount === 1 ? "" : "ies"} — daily digest`;
  } else if (bCount) {
    subject = `${bCount} new booking${bCount === 1 ? "" : "s"} — daily digest`;
  } else {
    subject = `${eCount} new enquiry${eCount === 1 ? "" : "ies"} — daily digest`;
  }

  const lines = [];
  if (bCount) {
    lines.push(`${bCount} new booking${bCount === 1 ? "" : "s"} confirmed since the last digest:`, ``);
    for (const b of bookings) {
      const arr = formatGuestDate(b.arrival_date);
      const paid = Number(b.deposit_paid) || 0;
      const total = Number(b.gross_revenue) || 0;
      const balanceDue = Math.max(total - paid, 0);
      const payNote =
        b.status === "confirmed"
          ? "paid in full"
          : `deposit paid; balance ${gbp(balanceDue)} due`;
      lines.push(
        `• ${b.guest_name} (${b.guest_email || "no email"}) — arriving ${arr}, ${b.nights} night(s), ${b.guests || 0} guest(s). ${payNote}. Ref ${b.reference}.`
      );
    }
    lines.push(``);
  }
  if (eCount) {
    lines.push(`${eCount} new enquiry${eCount === 1 ? "" : "ies"} from the contact form:`, ``);
    for (const c of enquiries) {
      const when = formatEnquiryWhen(c.last_enquiry_at);
      const msg = String(c.last_enquiry_message || "").slice(0, 240);
      const phone = c.phone ? `, ${c.phone}` : "";
      lines.push(
        `• ${c.name || "(no name)"} (${c.email || "no email"}${phone}) — enquired ${when}: "${msg}"`
      );
    }
    lines.push(``);
  }
  lines.push(`View everything in admin: ${appBaseUrl}/admin`);
  lines.push(``, `Ty Dee Seaview Escapes — Polperro, Looe, Cornwall`);
  const text = lines.join("\n");

  // HTML part — figures as a clean list, the admin link hyperlinked.
  const adminUrl = `${appBaseUrl}/admin`;
  let body = `<h1 style="margin:0 0 4px;font-size:22px;line-height:1.2;color:#1C2A31;">Daily digest</h1>`;
  body += `<p style="margin:0 0 20px;font-size:14px;color:#5E6E70;">Ty Dee Seaview Escapes</p>`;
  if (bCount) {
    body += para(`<strong>${bCount} new booking${bCount === 1 ? "" : "s"}</strong> confirmed since the last digest:`);
    const items = bookings.map((b) => {
      const arr = formatGuestDate(b.arrival_date);
      const paid = Number(b.deposit_paid) || 0;
      const total = Number(b.gross_revenue) || 0;
      const balanceDue = Math.max(total - paid, 0);
      const payNote = b.status === "confirmed" ? "paid in full" : `deposit paid; balance ${escapeHtml(gbp(balanceDue))} due`;
      return `<li style="margin:0 0 10px;font-size:15px;line-height:1.5;">${escapeHtml(b.guest_name)} — arriving ${escapeHtml(arr)}, ${b.nights} night(s), ${b.guests || 0} guest(s). ${payNote}. Ref ${escapeHtml(b.reference)}.</li>`;
    }).join("");
    body += `<ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.5;list-style:disc;">${items}</ul>`;
  }
  if (eCount) {
    body += para(`<strong>${eCount} new enquiry${eCount === 1 ? "" : "ies"}</strong> from the contact form:`);
    const items = enquiries.map((c) => {
      const when = formatEnquiryWhen(c.last_enquiry_at);
      const msg = escapeHtml(String(c.last_enquiry_message || "").slice(0, 240));
      return `<li style="margin:0 0 10px;font-size:15px;line-height:1.5;">${escapeHtml(c.name || "(no name)")} — enquired ${escapeHtml(when)}: "${msg}"</li>`;
    }).join("");
    body += `<ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.5;list-style:disc;">${items}</ul>`;
  }
  body += para(`${inlineLink(adminUrl, "View everything in admin")}.`);
  body += `<p style="margin:24px 0 0;font-size:14px;color:#5E6E70;">Ty Dee Seaview Escapes</p>`;
  const html = emailShell({ title: subject, body });

  return { subject, text, html };
}

// Guest cancellation confirmation — sent when a guest (or admin) cancels.
// `preview` is the refund preview (refund_due, retained, refund_percent,
// refund_tier, cooling_off_expires_display). Shows exactly what was refunded
// and what was retained, with the policy link hyperlinked.
export function buildGuestCancellationEmail({ booking, preview, appBaseUrl }) {
  const arrivalLong = formatGuestDate(booking.arrival_date);
  const departureLong = formatGuestDate(addDaysIso(booking.arrival_date, booking.nights));
  const policyUrl = `${appBaseUrl}/terms`;
  const subject = `Your booking has been cancelled — Ty Dee Seaview Escapes`;
  const refundDue = Number(preview.refund_due) || 0;
  const retained = Number(preview.retained) || 0;
  const tier = preview.refund_tier || "";

  const lines = [
    `Hello ${booking.guest_name || ""},`,
    ``,
    `Your booking arriving ${arrivalLong} and departing ${departureLong} (${booking.nights} night(s)) has been cancelled as requested.`,
    `Booking reference: ${booking.reference}.`,
    ``,
  ];
  if (refundDue > 0) {
    lines.push(`A refund of ${gbp(refundDue)} (${preview.refund_percent}% of what you paid) will be returned to your original payment method within 10 working days.`);
    if (tier) lines.push(`Cancellation band applied: ${tier}.`);
    if (retained > 0) {
      lines.push(`Under the cancellation policy, ${gbp(retained)} is retained.`);
    }
  } else {
    lines.push(`Under the cancellation policy, no refund is due for this cancellation.`);
  }
  lines.push(``, `Our cancellation policy: ${policyUrl}`, ``, `Ty Dee Seaview Escapes — Polperro, Looe, Cornwall`);
  const text = lines.join("\n");

  let body = `<h1 style="margin:0 0 4px;font-size:22px;line-height:1.2;color:#1C2A31;">Your booking has been cancelled</h1>`;
  body += `<p style="margin:0 0 20px;font-size:14px;color:#5E6E70;">Ty Dee Seaview Escapes</p>`;
  body += para(`Hello ${escapeHtml(booking.guest_name || "")},`);
  body += para(`Your booking arriving ${escapeHtml(arrivalLong)} and departing ${escapeHtml(departureLong)} (${booking.nights} night(s)) has been cancelled as requested.`);
  body += figureBox([
    boxLabel("Your stay"),
    figRow("Arriving", arrivalLong),
    figRow("Departing", departureLong),
    figRow("Length", `${booking.nights} night(s)`),
    figRow("Booking ref", booking.reference),
  ].join(""));
  const refundRows = [boxLabel("Refund")];
  if (refundDue > 0) {
    refundRows.push(figRow("Refunded", `${gbp(refundDue)} (${preview.refund_percent}%)`));
    if (tier) refundRows.push(figRow("Band applied", tier));
    if (retained > 0) refundRows.push(figRow("Retained", gbp(retained)));
    refundRows.push(`<p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:#5E6E70;">Returned to your original payment method within 10 working days.</p>`);
  } else {
    refundRows.push(`<p style="margin:0;font-size:15px;line-height:1.5;">No refund is due under the cancellation policy.</p>`);
  }
  body += figureBox(refundRows.join(""));
  body += para(`Read ${inlineLink(policyUrl, "our cancellation policy")}.`);
  body += `<p style="margin:24px 0 0;font-size:14px;color:#5E6E70;">Ty Dee Seaview Escapes</p>`;
  const html = emailShell({ title: subject, body });

  return { subject, text, html };
}

// Owner cancellation alert — owner-facing, no URLs, plain text only.
export function buildOwnerCancellationAlert({ booking, preview }) {
  const arrivalLong = formatGuestDate(booking.arrival_date);
  const refundDue = Number(preview.refund_due) || 0;
  const subject = `Booking cancelled — ${booking.guest_name}`;
  const text = `${booking.guest_name} (${booking.guest_email || "no email"}) cancelled their booking arriving ${arrivalLong}, ${booking.nights} night(s). Refund ${gbp(refundDue)} (${preview.refund_tier}). Ref ${booking.reference}.`;
  return { subject, text };
}

function formatEnquiryWhen(iso) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/London",
    });
  } catch {
    return iso;
  }
}