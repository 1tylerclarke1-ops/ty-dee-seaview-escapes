// Admin-only — records the moment the owner looked at the dashboard, so the
// "new bookings since you last looked" indicator can be computed. This is the
// primary record for owner awareness: it cannot be throttled or filtered by
// any email cap. Upserts the singleton AdminState row.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin required" }, { status: 403 });
    }
    const now = new Date().toISOString();
    const rows = await base44.asServiceRole.entities.AdminState.list(null, 10);
    if (rows && rows[0]) {
      await base44.asServiceRole.entities.AdminState.update(rows[0].id, {
        last_viewed_at: now,
      });
    } else {
      await base44.asServiceRole.entities.AdminState.create({
        last_viewed_at: now,
      });
    }
    return Response.json({ ok: true, last_viewed_at: now });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}