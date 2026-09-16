import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { filterSegment, segmentById } from "../../shared/contacts.ts";
import { describeOffer } from "../../shared/offers.ts";
import { seasonForDate } from "../../shared/pricing.ts";
import { formatGuestDate } from "../../shared/bookingEmail.ts";
import { renderTemplate, textToHtml, DEFAULT_TEMPLATES } from "../../shared/emailTemplates.ts";
import { appBaseUrl } from "../../shared/origin.ts";

// Send an offer email to a segment of the guest list, using the owner's
// editable template (template_type, default "late_availability"). preview_only
// returns the recipient count and a sample email without sending. Sending
// enforces consent in code: only contacts with marketing_consent=true and
// unsubscribed=false are emailed. Every email carries a single-use offer link
// and a one-click unsubscribe link. Reaching non-registered addresses requires
// a connected custom domain on a paid plan.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin required" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const { offer_id, segment, preview_only, template_type } = body;
    if (!offer_id || !segment) {
      return Response.json({ error: "offer_id and segment are required" }, { status: 400 });
    }
    const tplType = template_type || "late_availability";

    const offer = await base44.asServiceRole.entities.Offer.get(offer_id);
    if (!offer) return Response.json({ error: "Offer not found" }, { status: 404 });

    const contacts = await base44.asServiceRole.entities.Contact.list(null, 1000);
    const recipients = filterSegment(contacts || [], segment);
    const seg = segmentById(segment);

    const arrival = new Date(offer.arrival_date + "T00:00:00Z");
    const season = seasonForDate(arrival);
    const desc = describeOffer(offer.type, offer.value);
    const offerLink = `${appBaseUrl()}/offer/${offer.token}`;
    const departureStr = offer.nights
      ? new Date(arrival.getTime() + offer.nights * 86400000).toISOString().slice(0, 10)
      : "";

    // Load the owner's template for this type; fall back to the seeded default.
    const tpls = await base44.asServiceRole.entities.EmailTemplate.list(null, 100);
    let tpl = (tpls || []).find((t) => t.type === tplType);
    if (!tpl) tpl = DEFAULT_TEMPLATES.find((t) => t.type === tplType) || DEFAULT_TEMPLATES[0];

    const buildEmail = (c) => {
      const first = (c.name || "there").split(" ")[0];
      const unsub = `${appBaseUrl()}/unsubscribe/${c.unsubscribe_token}`;
      const vars = {
        name: first,
        arrival_date: formatGuestDate(offer.arrival_date),
        departure_date: departureStr ? formatGuestDate(departureStr) : "",
        nights: offer.nights,
        season: season ? ` · ${season.name}` : "",
        offer_description: offer.visibility === "public" ? desc : `A private offer: ${desc}`,
        offer_link: offerLink,
        unsubscribe_link: unsub,
        consent_link: "",
      };
      const { subject, text } = renderTemplate(tpl, vars);
      const html =
        textToHtml(text) +
        `<img src="${appBaseUrl()}/functions/trackOpen?token=${offer.token}" width="1" height="1" alt="">`;
      return { text, html, subject };
    };

    if (preview_only) {
      const sample = recipients[0] ? buildEmail(recipients[0]) : null;
      return Response.json({
        ok: true,
        preview: true,
        segment: seg?.label || segment,
        template_type: tplType,
        recipient_count: recipients.length,
        subject: sample?.subject || null,
        sample,
      });
    }

    let sent = 0, failed = 0;
    for (const c of recipients) {
      try {
        const e = buildEmail(c);
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: c.email,
          subject: e.subject,
          html: e.html,
          text: e.text,
        });
        sent++;
      } catch {
        failed++;
      }
    }
    await base44.asServiceRole.entities.Offer.update(offer_id, {
      sent_to_segment: segment,
      sent_at: new Date().toISOString(),
    });
    return Response.json({ ok: true, sent, failed, recipient_count: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}