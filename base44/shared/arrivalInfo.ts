// Arrival information email — sent to fully-paid (confirmed) guests arriving
// within 3 days. Triggered by a daily 09:00 job and, for last-minute bookings,
// immediately on payment. Never sent twice (tracked on the booking), never for
// a cancelled booking.
//
// The lockbox code lives in the ArrivalInfoSettings entity and is read at send
// time — never hardcoded — so the owner can change it between guests. The
// settings entity is admin-only (RLS); the code never appears on any public
// page, the tokenised manage page, or any other email template.

import { daysBetween, todayIso, addDaysIso } from "./cancellation.ts";
import { logEmailAttempt } from "./emailLog.ts";
import { appBaseUrl } from "./origin.ts";
import {
  escapeHtml,
  emailShell,
  figureBox,
  boxLabel,
  figRow,
  inlineLink,
  para,
} from "./emailHtml.ts";

const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatGuestDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00Z");
  return `${DAYS_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Escape HTML and convert newlines to <br> so multi-line admin text renders.
function esc(s) {
  return escapeHtml(s == null ? "" : String(s)).split("\n").join("<br>");
}

// Read the current arrival info settings from the entity. Returns null if not
// yet configured. The lockbox code is read here, at send time.
export async function getArrivalInfoSettings(base44) {
  const rows = await base44.asServiceRole.entities.ArrivalInfoSettings.list();
  return (rows && rows[0]) || null;
}

// Replace {{park_map}} placeholders with a hyperlinked "park map" (HTML) or
// "park map (url)" (plain text). The admin writes {{park_map}} in the editable
// text where they want the Find Us link to appear.
function replaceParkMap(text, findUsUrl, isHtml) {
  if (!text) return "";
  const link = isHtml ? inlineLink(findUsUrl, "park map") : `park map (${findUsUrl})`;
  return text.split("{{park_map}}").join(link);
}

export function buildArrivalInfoEmail({ booking, settings, appBaseUrl: baseUrl }) {
  const arrivalLong = formatGuestDate(booking.arrival_date);
  const departureLong = formatGuestDate(addDaysIso(booking.arrival_date, booking.nights));
  const findUsUrl = `${baseUrl}/find-us`;
  const hasDogs = (booking.dog_count || 0) > 0;

  const subject = `Your arrival at Ty Dee Seaview Escapes — ${arrivalLong}`;

  // --- Plain text ---
  const lines = [
    `Hello ${booking.guest_name || ""},`,
    ``,
    `Your stay is nearly here — arriving ${arrivalLong}, departing ${departureLong}.`,
    `Check-in from ${settings.check_in_time}. Check-out by ${settings.check_out_time}.`,
    ``,
    `Finding us`,
    settings.park_address || "",
    settings.park_postcode || "",
    settings.directions_brief || "",
    settings.steep_road_note || "",
    ``,
    `See the park map and full directions: ${findUsUrl}`,
    ``,
    `Parking`,
    settings.parking_info || "",
    ``,
    `Lockbox`,
    settings.lockbox_location || "",
    `Code: ${settings.lockbox_code}`,
    ``,
    `WiFi`,
    `Network: ${settings.wifi_network || ""}`,
    `Password: ${settings.wifi_password || ""}`,
    ``,
    `Contact on the day`,
    `${settings.contact_number || ""}`,
    ``,
    `Departure`,
    settings.departure_instructions || "",
  ];
  if (hasDogs) {
    lines.push(
      ``,
      `Travelling with your dog`,
      `What to bring — ${replaceParkMap(settings.dog_bring_items, findUsUrl, false)}`,
      `Waste — ${replaceParkMap(settings.dog_waste_note, findUsUrl, false)}`,
      `Walking — ${replaceParkMap(settings.dog_walking_note, findUsUrl, false)}`,
      `House rules — ${settings.dog_house_rules || ""}`,
    );
  }
  lines.push(``, `Ty Dee Seaview Escapes — Polperro, Looe, Cornwall`);
  const text = lines.join("\n");

  // --- HTML ---
  let body = `<h1 style="margin:0 0 4px;font-size:22px;line-height:1.2;color:#1C2A31;">Your arrival</h1>`;
  body += `<p style="margin:0 0 20px;font-size:14px;color:#5E6E70;">Ty Dee Seaview Escapes — Polperro, Looe, Cornwall</p>`;
  body += para(`Hello ${escapeHtml(booking.guest_name || "")},`);
  body += para(`Your stay is nearly here — arriving <strong>${escapeHtml(arrivalLong)}</strong>, departing <strong>${escapeHtml(departureLong)}</strong>.`);

  body += figureBox([
    boxLabel("Your stay"),
    figRow("Arriving", arrivalLong),
    figRow("Departing", departureLong),
    figRow("Check-in", settings.check_in_time || ""),
    figRow("Check-out", settings.check_out_time || ""),
  ].join(""));

  body += para(`<strong>Finding us</strong>`);
  body += para(esc(settings.park_address) + (settings.park_postcode ? `<br>${esc(settings.park_postcode)}` : ""));
  if (settings.directions_brief) body += para(esc(settings.directions_brief));
  if (settings.steep_road_note) body += para(esc(settings.steep_road_note));
  body += para(`${inlineLink(findUsUrl, "See the park map and full directions")}.`);

  body += para(`<strong>Parking</strong>`);
  body += para(esc(settings.parking_info));

  body += figureBox([
    boxLabel("Lockbox"),
    figRow("Location", settings.lockbox_location || ""),
    figRow("Code", settings.lockbox_code || ""),
  ].join(""));

  body += figureBox([
    boxLabel("WiFi"),
    figRow("Network", settings.wifi_network || ""),
    figRow("Password", settings.wifi_password || ""),
  ].join(""));

  body += para(`<strong>Contact on the day</strong>`);
  body += para(esc(settings.contact_number));

  body += para(`<strong>Departure</strong>`);
  body += para(esc(settings.departure_instructions));

  if (hasDogs) {
    body += para(`<strong>Travelling with your dog</strong>`);
    if (settings.dog_bring_items) body += para(`<strong>What to bring</strong> — ${esc(replaceParkMap(settings.dog_bring_items, findUsUrl, true))}`);
    if (settings.dog_waste_note) body += para(`<strong>Waste</strong> — ${esc(replaceParkMap(settings.dog_waste_note, findUsUrl, true))}`);
    if (settings.dog_walking_note) body += para(`<strong>Walking</strong> — ${esc(replaceParkMap(settings.dog_walking_note, findUsUrl, true))}`);
    if (settings.dog_house_rules) body += para(`<strong>House rules</strong> — ${esc(settings.dog_house_rules)}`);
  }

  body += `<p style="margin:24px 0 0;font-size:14px;color:#5E6E70;">Ty Dee Seaview Escapes</p>`;
  const html = emailShell({ title: subject, body });

  return { subject, text, html };
}

// Send the arrival info email to a single booking. Reads the CURRENT settings
// at send time (lockbox code is never hardcoded). Idempotent unless force
// (manual resend). Never sends for a cancelled/expired booking. Updates the
// booking's tracking fields and logs the attempt. Returns { sent, error }.
export async function sendArrivalInfoForBooking(base44, booking, { force = false } = {}) {
  // Never send for a cancelled or expired booking.
  if (booking.status === "cancelled" || booking.status === "expired") {
    return { sent: false, skipped: "booking cancelled or expired" };
  }

  // Idempotency — never send twice unless forced (manual resend).
  if (!force && booking.arrival_info_sent_at) {
    return { sent: false, skipped: "already sent" };
  }

  if (!booking.guest_email) {
    return { sent: false, error: "No guest email on the booking" };
  }

  // Read the current settings — lockbox code at send time.
  const settings = await getArrivalInfoSettings(base44);
  if (!settings) {
    return { sent: false, error: "Arrival info settings not configured — set them in admin" };
  }
  if (!settings.lockbox_code) {
    return { sent: false, error: "Lockbox code not set — configure it in admin before sending" };
  }

  const { subject, text, html } = buildArrivalInfoEmail({
    booking, settings, appBaseUrl: appBaseUrl(),
  });

  let ok = false;
  let err = null;
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: booking.guest_email, subject, text, html,
    });
    ok = true;
  } catch (e) {
    err = e?.message || String(e);
  }

  await logEmailAttempt(base44, {
    booking_id: booking.id, recipient: booking.guest_email,
    template: "arrival_info", subject, ok, error: err,
  });

  // Update tracking — clear failure flags on success, set on failure.
  try {
    await base44.asServiceRole.entities.Booking.update(booking.id, {
      arrival_info_sent_at: ok ? new Date().toISOString() : (booking.arrival_info_sent_at || null),
      arrival_info_send_failed: !ok,
      arrival_info_error: ok ? null : err,
    });
  } catch {}

  return { sent: ok, error: ok ? null : err };
}

// Immediate send on payment — only if fully paid (confirmed), arriving within
// 3 days, and not already sent. Called from both payment confirmation paths
// so a last-minute booking (Thursday for Friday) doesn't wait for the daily job.
export async function maybeSendArrivalInfoImmediate(base44, booking) {
  if (booking.status !== "confirmed") return { sent: false, skipped: "not confirmed" };
  if (booking.arrival_info_sent_at) return { sent: false, skipped: "already sent" };
  const days = daysBetween(todayIso(), booking.arrival_date);
  if (days < 0 || days > 3) return { sent: false, skipped: "not within 3 days" };
  return await sendArrivalInfoForBooking(base44, booking, { force: false });
}