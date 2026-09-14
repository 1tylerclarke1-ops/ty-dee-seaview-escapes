import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// Public — returns only published AND verified reviews, newest first. The
// Review entity is admin-read by RLS, so unpublished/unverified reviews are
// never exposed here. Used on the home page and caravan page.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const reviews = await base44.asServiceRole.entities.Review.filter(
      { published: true, verified: true },
      "-created_date",
      50
    );
    return Response.json({ ok: true, reviews: reviews || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}