// Daily digest — sends the owner ONE email listing every paid booking AND
// every contact-form enquiry not yet included in a digest, then marks them
// alerted/digested. Replaces the old per-booking owner alert (one email per
// booking), so owner email volume is at most one per day regardless of how
// many bookings or enquiries arrive, and the per-recipient email cap can
// never throttle a real alert. The admin dashboard's "new bookings since you
// last looked" indicator and the "unanswered enquiries" list remain the
// primary, email-independent records. Runs as a scheduled job (no user
// context) via the service role.
//
// The email body is built by the shared buildOwnerDigestEmail — the same
// function the admin "send test emails" tool uses, so a test renders the
// real digest, not a copy.
//
// A failed/throttled digest is logged to EmailLog and flagged on AdminState so
// the dashboard can show it; the bookings/enquiries themselves stay recorded
// regardless.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { logEmailAttempt } from "../../shared/emailLog.ts";
import { ownerEmail, buildOwnerDigestEmail } from "../../shared/bookingEmail.ts";
import { appBaseUrl } from "../../shared/origin.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // Paid bookings not yet included in a digest.
    const all = await base44.asServiceRole.entities.Booking.list(null, 500);
    const pendingBookings = (all || []).filter(
      (b) => ["deposit_paid", "confirmed"].includes(b.status) && !b.owner_alert_sent
    );

    // Contact-form enquiries not yet digested and not already resolved.
    const contacts = await base44.asServiceRole.entities.Contact.list(null, 500);
    const pendingEnquiries = (contacts || []).filter(
      (c) => c.last_enquiry_message && !c.enquiry_digest_sent && !c.enquiry_resolved
    );

    if (!pendingBookings.length && !pendingEnquiries.length) {
      await recordDigest(base44, { ok: true, count: 0, error: null, sent: false });
      return Response.json({ ok: true, count: 0, sent: false });
    }

    pendingBookings.sort(
      (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
    );
    pendingEnquiries.sort(
      (a, b) => new Date(b.last_enquiry_at).getTime() - new Date(a.last_enquiry_at).getTime()
    );

    const { subject, text } = buildOwnerDigestEmail({
      bookings: pendingBookings,
      enquiries: pendingEnquiries,
      appBaseUrl: appBaseUrl(),
    });

    let ok = false;
    let err = null;
    const owner = ownerEmail();
    if (!owner) {
      err = "OWNER_EMAIL secret is not configured";
    } else {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: owner,
          subject,
          text,
        });
        ok = true;
      } catch (e) {
        err = e?.message || String(e);
      }
    }

    await logEmailAttempt(base44, {
      booking_id: null,
      recipient: owner || "(unset)",
      template: "owner_digest",
      subject,
      ok,
      error: err,
    });

    if (ok) {
      // Mark every included booking as alerted so the next digest skips it.
      try {
        if (pendingBookings.length) {
          await base44.asServiceRole.entities.Booking.bulkUpdate(
            pendingBookings.map((b) => ({ id: b.id, owner_alert_sent: true }))
          );
        }
      } catch {}
      // Mark every included enquiry as digested so the next digest skips it.
      // The dashboard banner keeps showing it until the owner resolves it.
      try {
        if (pendingEnquiries.length) {
          await base44.asServiceRole.entities.Contact.bulkUpdate(
            pendingEnquiries.map((c) => ({ id: c.id, enquiry_digest_sent: true }))
          );
        }
      } catch {}
    }

    const count = pendingBookings.length + pendingEnquiries.length;
    await recordDigest(base44, { ok, count, error: ok ? null : err, sent: true });
    return Response.json({ ok: true, count, sent: true, emailOk: ok, error: err });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function recordDigest(base44, { ok, count, error, sent }) {
  try {
    const rows = await base44.asServiceRole.entities.AdminState.list(null, 10);
    const data = {
      last_digest_sent_at: new Date().toISOString(),
      last_digest_ok: ok,
      last_digest_count: count,
      last_digest_had_bookings: !!sent,
      last_digest_error: error || null,
    };
    if (rows && rows[0]) {
      await base44.asServiceRole.entities.AdminState.update(rows[0].id, data);
    } else {
      await base44.asServiceRole.entities.AdminState.create({
        ...data,
        last_viewed_at: null,
      });
    }
  } catch {}
}