import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// Public — a guest submits a review from the post-stay email link. The link
// is keyed to the booking id, so the review is "verified" (linked to a real
// booking) the moment it is created. It is NOT published by default — the
// owner publishes it in admin. An unverified review can never exist via this
// path: a valid, recently-departed booking id is required and validated, and
// only one review is allowed per booking.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const bookingId = String(body.booking_id || "").trim();
    const rating = Math.min(5, Math.max(1, Number(body.rating) || 0));
    const text = String(body.text || "").trim().slice(0, 2000);
    const name = String(body.guest_name || "").trim().slice(0, 80);

    if (!bookingId || !rating || !text) {
      return Response.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ ok: false, error: "Booking not found" }, { status: 404 });

    const dep = booking.departure_date ? new Date(booking.departure_date + "T00:00:00Z") : null;
    if (!dep) return Response.json({ ok: false, error: "Not eligible" }, { status: 400 });
    const daysSince = (Date.now() - dep.getTime()) / 86400000;
    if (daysSince < 0 || daysSince > 120) {
      return Response.json({ ok: false, error: "Review window closed" }, { status: 400 });
    }

    // One review per booking.
    const existing = await base44.asServiceRole.entities.Review.filter({ booking_id: bookingId });
    if (existing && existing.length) {
      return Response.json({ ok: false, error: "Already reviewed" }, { status: 409 });
    }

    const monthStayed = booking.arrival_date
      ? new Date(booking.arrival_date + "T00:00:00Z").toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
      : "";

    await base44.asServiceRole.entities.Review.create({
      guest_name: name || booking.guest_name || "A guest",
      month_stayed: monthStayed,
      rating,
      text,
      verified: true,
      published: false,
      booking_id: bookingId,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}