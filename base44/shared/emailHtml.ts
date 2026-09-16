// Minimal, inline-styled HTML email scaffolding shared by every email the app
// sends. Design rules (per the owner): readable body text, clear spacing,
// payment figures set apart, a plain sign-off. No heavy branding, no images,
// no dark backgrounds. Renders well on a phone and degrades gracefully if
// images are blocked — there are no images to block. URLs are NEVER shown as
// text: every link is hyperlinked words (a styled button for the primary
// call-to-action, inline links for the rest). A matching plain-text fallback is
// always sent alongside for deliverability.
//
// All styling is inline because most email clients strip <style> blocks.

const TEXT = "#1C2A31";
const MUTED = "#5E6E70";
const LINE = "#DCE2E0";
const BASE = "#F5F7F6";
const ACCENT = "#2F6F6B";

export function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Wrap body content in the standard email shell. `title` is the <title> only
// (not shown in the body). `body` is pre-built inner HTML.
export function emailShell({ title, body }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${BASE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT};-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BASE};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border:1px solid ${LINE};">
<tr><td style="padding:32px 28px;">
${body}
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// A boxed section used to set the stay and payment figures apart. `innerHtml`
// is the pre-built rows.
export function figureBox(innerHtml) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${BASE};border:1px solid ${LINE};"><tr><td style="padding:16px 18px;">${innerHtml}</td></tr></table>`;
}

// A small uppercase label inside a figure box.
export function boxLabel(text) {
  return `<p style="margin:0 0 10px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};">${escapeHtml(text)}</p>`;
}

// A single figure row: "Label: value" with the value bold.
export function figRow(label, value) {
  return `<p style="margin:0 0 6px;font-size:15px;line-height:1.5;">${escapeHtml(label)}: <strong>${escapeHtml(value)}</strong></p>`;
}

// A standalone prominent call-to-action button (the primary link).
export function buttonLink(href, label) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:12px 22px;font-size:15px;font-weight:600;border-radius:4px;">${escapeHtml(label)}</a>`;
}

// An inline hyperlinked phrase within body text.
export function inlineLink(href, label) {
  return `<a href="${escapeHtml(href)}" style="color:${ACCENT};text-decoration:underline;">${escapeHtml(label)}</a>`;
}

// A body paragraph.
export function para(text) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${text}</p>`;
}