import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// Open-tracking beacon — a 1x1 transparent GIF embedded in offer emails.
// Increments the offer's open_count and returns the image. Public, no auth.
// Called as a GET image: /functions/trackOpen?token=...
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (token) {
      const offers = await base44.asServiceRole.entities.Offer.filter({ token });
      const offer = offers && offers[0];
      if (offer) {
        await base44.asServiceRole.entities.Offer.update(offer.id, {
          open_count: (offer.open_count || 0) + 1,
        });
      }
    }
  } catch {
    /* never fail the image */
  }
  const gif = Uint8Array.from(
    atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
    (c) => c.charCodeAt(0)
  );
  return new Response(gif, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
  });
}