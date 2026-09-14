import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { describeOffer } from "../../shared/offers.ts";

// Public endpoint — no auth. Returns live public offers (visibility=public,
// not redeemed, arrival in the future, valid_until not expired) so the
// availability page can show a quiet marker. Returns only the fields the
// public site needs. Never exposes tokens, segments, or counts.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().slice(0, 10);
    const offers = await base44.asServiceRole.entities.Offer.list(null, 500);
    const live = (offers || []).filter((o) => {
      if (o.visibility !== "public") return false;
      if (o.redeemed) return false;
      if (!o.arrival_date || o.arrival_date < today) return false;
      if (o.valid_until && o.valid_until < today) return false;
      return true;
    });
    const out = live.map((o) => ({
      arrival_date: o.arrival_date,
      nights: o.nights,
      type: o.type,
      value: o.value,
      description: describeOffer(o.type, o.value),
      reason: o.reason || null,
    }));
    return Response.json({ ok: true, offers: out });
  } catch (error) {
    return Response.json({ ok: true, offers: [] });
  }
}