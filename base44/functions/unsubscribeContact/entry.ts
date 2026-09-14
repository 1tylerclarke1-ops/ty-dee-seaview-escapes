import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// One-click unsubscribe. Looks up the contact by their per-recipient
// unsubscribe_token (from the email link) and sets unsubscribed=true with the
// date. Public — no auth, no email in the URL. Called from /unsubscribe/:token.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = body.token;
    if (!token) return Response.json({ ok: false, error: "token required" });

    const contacts = await base44.asServiceRole.entities.Contact.filter({ unsubscribe_token: token });
    const c = contacts && contacts[0];
    if (!c) return Response.json({ ok: false, error: "Link not found" });

    await base44.asServiceRole.entities.Contact.update(c.id, {
      unsubscribed: true,
      unsubscribe_date: new Date().toISOString().slice(0, 10),
    });
    return Response.json({ ok: true, message: "You've been unsubscribed from marketing emails." });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}