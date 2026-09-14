import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// Public consent capture — reached from the post-stay email's opt-in link.
// The token is the contact's unsubscribe_token, so no email is exposed in the
// URL. Grants marketing consent (opt-in only, never pre-ticked). Idempotent.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || (() => {
      try { return (req.json && false) ? "" : ""; } catch { return ""; }
    })();
    let tokenVal = token;
    if (!tokenVal) {
      const body = await req.json().catch(() => ({}));
      tokenVal = body.token;
    }
    if (!tokenVal) {
      return Response.json({ error: "Token required" }, { status: 400 });
    }

    const contacts = await base44.asServiceRole.entities.Contact.list(null, 1000);
    const contact = (contacts || []).find((c) => c.unsubscribe_token === tokenVal);
    if (!contact) {
      return Response.json({ ok: false, error: "Contact not found" }, { status: 404 });
    }
    await base44.asServiceRole.entities.Contact.update(contact.id, {
      marketing_consent: true,
      consent_date: new Date().toISOString(),
      consent_source: "post_stay",
      unsubscribed: false,
    });
    return Response.json({ ok: true, name: contact.name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}