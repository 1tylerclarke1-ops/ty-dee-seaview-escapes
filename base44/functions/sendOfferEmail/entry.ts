import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { filterSegment, segmentById } from "../../shared/contacts.ts";
import { describeOffer } from "../../shared/offers.ts";
import { seasonForDate, calculatePrice, formatLong, formatShort } from "../../shared/pricing.ts";

const APP_ORIGIN = "https://ty-dee-stays.base44.app";

// Send an offer email to a segment of the guest list. preview_only=true
// returns the recipient count and a sample email without sending. Sending
// enforces consent in code: only contacts with marketing_consent=true and
// unsubscribed=false are emailed. Every email carries a single-use offer
// link and a one-click unsubscribe link. Reaching non-registered addresses
// requires a connected custom domain on a paid plan.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin required" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const { offer_id, segment, preview_only } = body;
    if (!offer_id || !segment) {
      return Response.json({ error: "offer_id and segment are required" }, { status: 400 });
    }

    const offer = await base44.asServiceRole.entities.Offer.get(offer_id);
    if (!offer) return Response.json({ error: "Offer not found" }, { status: 404 });

    const contacts = await base44.asServiceRole.entities.Contact.list(null, 1000);
    const recipients = filterSegment(contacts || [], segment);
    const seg = segmentById(segment);

    const arrival = new Date(offer.arrival_date + "T00:00:00Z");
    const season = seasonForDate(arrival);
    const desc = describeOffer(offer.type, offer.value);
    const offerLink = `${APP_ORIGIN}/offer/${offer.token}`;

    const buildEmail = (c) => {
      const first = (c.name || "there").split(" ")[0];
      const unsub = `${APP_ORIGIN}/unsubscribe/${c.unsubscribe_token}`;
      const text =
        `Hello ${first},\n\n` +
        `A late availability stay has opened up at Ty Dee Seaview Escapes.\n\n` +
        `  Arriving ${formatLong(offer.arrival_date)} · ${offer.nights} nights` +
        (season ? ` · ${season.name}` : "") + `\n` +
        `  ${offer.visibility === "public" ? desc : "A private offer: " + desc}\n\n` +
        `See your offer and dates here:\n${offerLink}\n\n` +
        `No more than one email a month. To stop these updates, click:\n${unsub}\n\n` +
        `— Ty Dee Seaview Escapes`;
      const html =
        `<p>Hello ${first},</p>` +
        `<p>A late availability stay has opened up at Ty Dee Seaview Escapes.</p>` +
        `<p style="font-size:16px;line-height:1.5">` +
        `Arriving ${formatLong(offer.arrival_date)} · ${offer.nights} nights` +
        (season ? ` · ${season.name}` : "") + `<br>` +
        `${offer.visibility === "public" ? desc : "A private offer: " + desc}</p>` +
        `<p><a href="${offerLink}" style="display:inline-block;padding:12px 22px;background:#2F6F6B;color:#fff;text-decoration:none;font-size:15px">See your offer</a></p>` +
        `<p style="font-size:12px;color:#5E6E70">No more than one email a month. ` +
        `<a href="${unsub}">Unsubscribe</a>.</p>` +
        `<img src="${APP_ORIGIN}/functions/trackOpen?token=${offer.token}" width="1" height="1" alt="">`;
      return { text, html, subject: `Late availability — ${formatShort(offer.arrival_date)} · ${desc}` };
    };

    if (preview_only) {
      const sample = recipients[0] ? buildEmail(recipients[0]) : null;
      return Response.json({
        ok: true,
        preview: true,
        segment: seg?.label || segment,
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