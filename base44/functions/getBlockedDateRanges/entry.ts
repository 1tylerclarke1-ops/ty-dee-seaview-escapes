import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// Public: returns blocked date ranges only — { start_date, end_date }[] with
// no reason or notes. Used by the guest calendar to show blocked dates as
// unavailable. A guest never sees why a date is blocked, only that it is.
// The service role bypasses the admin-only RLS; this function exposes only
// the date ranges, never the reason.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const blocks = await base44.asServiceRole.entities.BlockedDate.list("-start_date", 500);
    const ranges = (blocks || []).map((b) => ({ start_date: b.start_date, end_date: b.end_date }));
    return Response.json({ ranges });
  } catch (error) {
    return Response.json({ ranges: [] });
  }
}