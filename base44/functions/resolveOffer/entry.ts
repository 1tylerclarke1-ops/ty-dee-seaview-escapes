import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// Resolve a single-use offer link (the public /offer/:token page). Returns the
// offer details for display and counts a click. Public — no auth.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = body.token;
    if (!token) return Response.json({ error: "token required" }, { status: 400 });

    const offers = await base44.asServiceRole.entities.Offer.filter({ token });
    const offer = offers && offers[0];
    if (!offer) return Response.json({ ok: false, error: "Offer not found or expired" });

    await base44.asServiceRole.entities.Offer.update(offer.id, {
      click_count: (offer.click_count || 0) + 1,
    });

    return Response.json({
      ok: true,
      offer: {
        arrival_date: offer.arrival_date,
        nights: offer.nights,
        type: offer.type,
        value: offer.value,
        visibility: offer.visibility,
        redeemed: !!offer.redeemed,
        valid_until: offer.valid_until || null,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}