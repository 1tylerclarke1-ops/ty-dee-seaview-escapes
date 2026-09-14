import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  evaluateOffer, describeOffer, isProtectedSeason, ladderRung, CLEANING_COST,
} from "../../shared/offers.ts";
import { calculatePrice, seasonForDate } from "../../shared/pricing.ts";
import { randomToken } from "../../shared/contacts.ts";

// Create an offer against an unsold stay. confirm=false (default) returns a
// preview — the floor-adjusted value, net per night after the offer, whether
// it clears the floor — with no side effects. confirm=true creates the Offer
// record with a single-use token. The floor is always enforced: an offer that
// breaches min_net_per_night is refused even on confirm. Admin-only.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin required" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const { arrival_date, nights, type, value, visibility, reason, valid_until, segment, confirm } = body;
    if (!arrival_date || !nights || !type) {
      return Response.json({ error: "arrival_date, nights and type are required" }, { status: 400 });
    }
    const arrival = new Date(arrival_date + "T00:00:00Z");
    const season = seasonForDate(arrival);
    if (!season) return Response.json({ error: "Arrival date is outside the booking season" }, { status: 400 });

    const price = calculatePrice(arrival, Number(nights), 0);
    if (!price) return Response.json({ error: "Could not price this stay" }, { status: 400 });

    const today = new Date().toISOString().slice(0, 10);
    const daysToArrival = Math.round(
      (arrival.getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000
    );
    const evalRes = evaluateOffer(type, Number(value) || 0, price.total, Number(nights));

    const preview = {
      arrival_date,
      nights: Number(nights),
      season: season.name,
      protected: isProtectedSeason(season.name),
      base_price: price.total,
      net_per_night_base: (price.total - CLEANING_COST) / Number(nights),
      type,
      requested_value: Number(value) || 0,
      applied_value: evalRes.value,
      discount: evalRes.discount,
      net_per_night_after: evalRes.netPerNight,
      passes_floor: evalRes.passesFloor,
      adjusted: evalRes.adjusted,
      allowed: evalRes.allowed,
      description: describeOffer(type, evalRes.value),
      days_to_arrival: daysToArrival,
      rung: ladderRung(daysToArrival)?.rung || null,
    };

    if (!confirm) {
      return Response.json({ ok: true, confirm: false, preview });
    }
    if (!evalRes.allowed) {
      return Response.json(
        { error: "Offer breaches the net-per-night floor and cannot be applied", preview },
        { status: 400 }
      );
    }

    const offer = await base44.asServiceRole.entities.Offer.create({
      type,
      value: evalRes.value,
      arrival_date,
      nights: Number(nights),
      applies_to_stays: [`${arrival_date}:${nights}`],
      valid_until: valid_until || null,
      visibility: visibility || "private",
      reason: reason || "",
      redeemed: false,
      booking_id: "",
      token: randomToken(),
      sent_to_segment: segment || "",
      sent_at: null,
      open_count: 0,
      click_count: 0,
    });

    return Response.json({
      ok: true, confirm: true, preview, offer_id: offer.id, token: offer.token,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}