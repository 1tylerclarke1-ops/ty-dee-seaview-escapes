// Arrival information email — sent to fully-paid (confirmed) guests arriving
// within 3 days. Triggered by a daily 09:00 job and, for last-minute bookings,
// immediately on payment. Never sent twice (tracked on the booking), never for
// a cancelled booking.
//
// The lockbox code lives in the ArrivalInfoSettings entity and is read at send
// time — never hardcoded — so the owner can change it between guests. The
// settings entity is admin-only (RLS); the code never appears on any public
// page, the tokenised manage page, or any other email template.

import { daysBetween, todayIso } from "./cancellation.ts";
import { logEmailAttempt } from "./emailLog.ts";
import { appBaseUrl } from "./origin.ts";
import {
  escapeHtml,
  emailShell,
  figureBox,
  boxLabel,
  figRow,
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

// Arrival info email — word-for-word template. Only four values are dynamic
// (read at send time from ArrivalInfoSettings): WiFi network, WiFi password,
// lockbox code, and lockbox location. Everything else is fixed wording.
export function buildArrivalInfoEmail({ booking, settings }) {
  const arrivalLong = formatGuestDate(booking.arrival_date);
  const subject = `Welcome to Ty Dee Seaview Escapes — arriving ${arrivalLong}`;

  const wifiNetwork = settings.wifi_network || "";
  const wifiPassword = settings.wifi_password || "";
  const lockboxCode = settings.lockbox_code || "";
  const lockboxLocation = settings.lockbox_location || "";

  // --- Plain text (word for word as the owner specified) ---
  const text = [
    `🌊 Welcome to Ty Dee Seaview Escapes 🌊`,
    ``,
    `Hello and welcome!`,
    ``,
    `We're delighted to have you staying with us and hope you have a wonderful, relaxing break at Ty Dee Seaview Escapes.`,
    ``,
    `Wi-Fi`,
    ``,
    `Network: ${wifiNetwork}`,
    `Password: ${wifiPassword}`,
    ``,
    `Key Collection`,
    ``,
    `Lockbox Code: ${lockboxCode}`,
    ``,
    lockboxLocation,
    ``,
    `Following this message, you'll receive a picture showing the route from the park entrance to the caravan to help you find us easily.`,
    ``,
    `A Few Friendly Reminders`,
    ``,
    `- If you use the outdoor furniture, please could you replace the large protective cover once you've finished. This helps keep the furniture clean and in good condition for everyone to enjoy.`,
    `- There is a locked storage box on the decking containing the owner's personal belongings. Please do not remove the cover or attempt to open or access it during your stay.`,
    ``,
    `Need Any Help?`,
    ``,
    `If you have any questions or need assistance during your stay, please don't hesitate to get in touch. I'm available every day between 8:00am and 10:00pm and will be happy to help.`,
    ``,
    `We hope you have a fantastic stay and make some wonderful memories!`,
    ``,
    `Best regards,`,
    ``,
    `Tyler`,
  ].join("\n");

  // --- HTML ---
  let body = `<h1 style="margin:0 0 4px;font-size:22px;line-height:1.2;color:#1C2A31;">🌊 Welcome to Ty Dee Seaview Escapes 🌊</h1>`;
  body += `<p style="margin:0 0 20px;font-size:14px;color:#5E6E70;">Ty Dee Seaview Escapes — Polperro, Looe, Cornwall</p>`;
  body += para(`Hello and welcome!`);
  body += para(`We're delighted to have you staying with us and hope you have a wonderful, relaxing break at Ty Dee Seaview Escapes.`);

  body += figureBox([
    boxLabel("Wi-Fi"),
    figRow("Network", wifiNetwork),
    figRow("Password", wifiPassword),
  ].join(""));

  body += figureBox([
    boxLabel("Key Collection"),
    figRow("Lockbox Code", lockboxCode),
  ].join(""));
  if (lockboxLocation) body += para(esc(lockboxLocation));
  body += para(`Following this message, you'll receive a picture showing the route from the park entrance to the caravan to help you find us easily.`);

  body += para(`<strong>A Few Friendly Reminders</strong>`);
  body += `<ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.6;list-style:disc;">`;
  body += `<li style="margin:0 0 10px;">If you use the outdoor furniture, please could you replace the large protective cover once you've finished. This helps keep the furniture clean and in good condition for everyone to enjoy.</li>`;
  body += `<li style="margin:0 0 10px;">There is a locked storage box on the decking containing the owner's personal belongings. Please do not remove the cover or attempt to open or access it during your stay.</li>`;
  body += `</ul>`;

  body += para(`<strong>Need Any Help?</strong>`);
  body += para(`If you have any questions or need assistance during your stay, please don't hesitate to get in touch. I'm available every day between 8:00am and 10:00pm and will be happy to help.`);

  body += para(`We hope you have a fantastic stay and make some wonderful memories!`);
  body += `<p style="margin:24px 0 0;font-size:15px;color:#1C2A31;">Best regards,<br>Tyler</p>`;
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