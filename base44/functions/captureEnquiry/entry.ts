import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { normalizeEmail, randomToken } from "../../shared/contacts.ts";
import { ownerEmail, buildOwnerEnquiryAlertEmail } from "../../shared/bookingEmail.ts";
import { appBaseUrl } from "../../shared/origin.ts";
import { logEmailAttempt } from "../../shared/emailLog.ts";

// Capture an enquiry from the public checkout form. Upserts a Contact
// (source: enquiry, or keeps past_guest if they've stayed before) and records
// marketing consent ONLY when the guest ticked the opt-in box. Never pre-ticks,
// never bundled with the terms tick-box. An unticked box does not revoke
// existing consent — the one-click unsubscribe link is the revoke path.
// Public (no auth) — uses the service role.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    if (!email) return Response.json({ ok: false, skipped: true });

    const party = body.party_size ? Number(body.party_size) : null;
    const dogs = Number(body.dogs) || 0;
    const arrival = body.arrival_date || null;
    const month = arrival ? new Date(arrival + "T00:00:00Z").getUTCMonth() + 1 : null;
    const consent = !!body.marketing_consent;
    const utm = [body.utm_source, body.utm_medium, body.utm_campaign].filter(Boolean).join("/");
    const acquisition_source = body.acquisition_source || [body.how_heard, utm].filter(Boolean).join(" · ");

    const existing = await base44.asServiceRole.entities.Contact.filter({ email });
    const ex = existing && existing[0];

    const data = {
      name: body.name || ex?.name || "",
      email,
      phone: body.phone || ex?.phone || "",
      source: ex?.source === "past_guest" ? "past_guest" : "enquiry",
      acquisition_source: acquisition_source || ex?.acquisition_source || "",
      party_size_typical: party || ex?.party_size_typical || null,
      has_dog: !!(dogs || ex?.has_dog),
      dog_count: Math.max(dogs, ex?.dog_count || 0),
      first_seen: ex?.first_seen || new Date().toISOString().slice(0, 10),
    };
    if (month) {
      data.months_stayed = ex?.months_stayed
        ? [...new Set([...ex.months_stayed, month])]
        : [month];
    }
    if (consent) {
      data.marketing_consent = true;
      data.consent_date = new Date().toISOString();
      data.consent_source = body.consent_source || "checkout";
    }
    if (body.cancellation_acknowledged) {
      data.cancellation_acknowledged = true;
      data.cancellation_acknowledged_at =
        body.cancellation_acknowledged_at || new Date().toISOString();
    }
    // Free-text message from the public contact form (stored on the contact's
    // notes so the owner reads it in admin). Checkout enquiries have no
    // message, so this is a no-op there. A message also (re)surfaces the
    // contact as a new enquiry for the daily digest and the dashboard's
    // unanswered-enquiries list — resetting the flags means a repeat enquiry
    // from the same contact re-enters both.
    if (body.message) {
      const now = new Date().toISOString();
      const noteLine = `[Contact form — ${now.slice(0, 10)}]\n${body.message}`;
      data.notes = ex?.notes ? `${ex.notes}\n\n${noteLine}` : noteLine;
      data.last_enquiry_message = body.message;
      data.last_enquiry_at = now;
      data.enquiry_digest_sent = false;
      data.enquiry_resolved = false;
    }

    if (ex) {
      await base44.asServiceRole.entities.Contact.update(ex.id, data);
    } else {
      await base44.asServiceRole.entities.Contact.create({
        ...data,
        marketing_consent: data.marketing_consent || false,
        unsubscribed: false,
        unsubscribe_token: randomToken(),
      });
    }

    // Instant owner alert — best-effort, never affects the contact record
    // or the digest flags above. A failure here is logged but does not
    // change the response: the enquiry is already saved and will appear
    // in the next daily digest regardless.
    if (body.message) {
      const to = ownerEmail();
      if (to) {
        const { subject, text } = buildOwnerEnquiryAlertEmail({
          name: body.name, email, phone: body.phone, message: body.message,
          arrivalDate: body.arrival_date, partySize: party, dogCount: dogs,
          appBaseUrl: appBaseUrl(),
        });
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, text });
          await logEmailAttempt(base44, { recipient: to, template: "enquiry_alert", subject, ok: true });
        } catch (e) {
          await logEmailAttempt(base44, { recipient: to, template: "enquiry_alert", subject, ok: false, error: e?.message || String(e) });
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}