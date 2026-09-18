import { secrets } from "base44:runtime";

// Guards scheduled-job endpoints (expireHolds, sendBalanceReminders,
// weeklyGapsJob, sendOwnerBookingDigest, sendPostStayEmails,
// retryFailedConfirmations) so a stranger can't fire them over HTTP — two of
// them take real actions (auto-cancel bookings, apply discount offers).
//
// The platform runs scheduled workflows as an admin principal, so an admin
// session check is the primary gate and keeps the jobs firing on schedule.
// A caller may also present the configured JOB_SECRET (in the request body as
// `job_secret`) for manual or external invocation — but only when that secret
// is actually set, so an unset JOB_SECRET never opens a hole.
//
// Returns null when the caller is allowed, or a 403 Response to return.
export async function requireInternal(base44, req) {
  try {
    const user = await base44.auth.me();
    if (user && user.role === "admin") return null;
  } catch {}

  const jobSecret = secrets.get("JOB_SECRET");
  if (jobSecret) {
    let body = null;
    try {
      body = await req.json();
    } catch {}
    if (body && typeof body.job_secret === "string" && body.job_secret === jobSecret) {
      return null;
    }
  }
  return Response.json({ error: "Forbidden" }, { status: 403 });
}