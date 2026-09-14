import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { renderTemplate, textToHtml, DEFAULT_TEMPLATES } from "../../shared/emailTemplates.ts";
import { seasonForDate, formatLong } from "../../shared/pricing.ts";

const APP_ORIGIN = "https://ty-dee-stays.base44.app";

// Daily job — finds confirmed/deposit_paid bookings that departed two days ago
// and sends the post-stay email (thank you, review request, opt-in prompt).
// This is where the marketing list grows: the email asks permission, and the
// guest grants it via a one-click consent link keyed to their contact token.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    const target = new Date(today.getTime() - 2 * 24 * 3600 * 1000);
    const targetStr = target.toISOString().slice(0, 10);

    const bookings = await base44.asServiceRole.entities.Booking.list(null, 500);
    const due = (bookings || []).filter(
      (b) =>
        b.departure_date === targetStr &&
        ["confirmed", "deposit_paid"].includes(b.status) &&
        !b.post_stay_sent &&
        b.guest_email
    );

    // Load the post-stay template (fall back to seeded default).
    const tpls = await base44.asServiceRole.entities.EmailTemplate.list(null, 100);
    let tpl = (tpls || []).find((t) => t.type === "post_stay");
    if (!tpl) tpl = DEFAULT_TEMPLATES.find((t) => t.type === "post_stay");

    const contacts = await base44.asServiceRole.entities.Contact.list(null, 1000);

    let sent = 0;
    let failed = 0;
    for (const b of due) {
      try {
        // Find or create a contact so we have a consent token to link to.
        let contact = (contacts || []).find((c) => c.email === b.guest_email);
        if (!contact) {
          const token = (crypto.randomUUID?.() || String(Date.now())).replace(/-/g, "");
          contact = await base44.asServiceRole.entities.Contact.create({
            name: b.guest_name || "",
            email: b.guest_email,
            source: "past_guest",
            first_seen: b.arrival_date,
            last_stayed: b.departure_date,
            stays_count: 1,
            unsubscribe_token: token,
          });
          contacts.push(contact);
        }
        const arrival = new Date(b.arrival_date + "T00:00:00Z");
        const season = seasonForDate(arrival);
        const dep = b.departure_date;
        const vars = {
          name: (b.guest_name || "there").split(" ")[0],
          arrival_date: formatLong(b.arrival_date),
          departure_date: dep ? formatLong(dep) : "",
          nights: b.nights || "",
          season: season ? ` · ${season.name}` : "",
          offer_description: "",
          offer_link: "",
          unsubscribe_link: `${APP_ORIGIN}/unsubscribe/${contact.unsubscribe_token}`,
          consent_link: `${APP_ORIGIN}/consent/${contact.unsubscribe_token}`,
        };
        const { subject, text } = renderTemplate(tpl, vars);
        const html = textToHtml(text);
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: b.guest_email,
          subject,
          html,
          text,
        });
        await base44.asServiceRole.entities.Booking.update(b.id, { post_stay_sent: true });
        sent++;
      } catch {
        failed++;
      }
    }
    return Response.json({ ok: true, sent, failed, due: due.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}