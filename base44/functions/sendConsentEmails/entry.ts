import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { requireInternal } from "../../shared/internalCall.ts";
import { buildConsentEmail } from "../../shared/bookingEmail.ts";
import { logEmailAttempt } from "../../shared/emailLog.ts";
import { appBaseUrl } from "../../shared/origin.ts";

// Daily 09:00 job — 14 days after departure, sends the marketing-consent ask
// ONLY to guests who left a review (a Review record exists for the booking) and
// have not already consented or unsubscribed. One ask, no chase: the
// consent_email_sent flag on the booking (set ONLY on a successful send) means
// a guest who ignores it is never asked again — even if EmailLog rows are
// purged, the flag survives. A failed send leaves the flag unset so it retries
// the next day. The consent link is /consent/<contact.unsubscribe_token>.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const _guard = await requireInternal(base44, req);
    if (_guard) return _guard;
    const today = new Date();
    const target = new Date(today.getTime() - 14 * 24 * 3600 * 1000);
    const targetStr = target.toISOString().slice(0, 10);

    const bookings = await base44.asServiceRole.entities.Booking.list(null, 500);
    const due = (bookings || []).filter(
      (b) =>
        b.departure_date === targetStr &&
        ["confirmed", "deposit_paid"].includes(b.status) &&
        !b.consent_email_sent &&
        b.guest_email
    );

    const contacts = await base44.asServiceRole.entities.Contact.list(null, 1000);

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    for (const b of due) {
      let subject = "Consent request";
      try {
        // Only guests who left a review.
        const reviews = await base44.asServiceRole.entities.Review.filter({ booking_id: b.id });
        if (!reviews || !reviews.length) { skipped++; continue; }

        // Resolve the contact (created by the post-stay job 13 days earlier).
        const contact = (contacts || []).find((c) => c.email === b.guest_email);
        if (!contact || !contact.unsubscribe_token) { skipped++; continue; }

        // Never ask someone who already consented or unsubscribed.
        if (contact.marketing_consent || contact.unsubscribed) { skipped++; continue; }

        const built = buildConsentEmail({ booking: b, contact, appBaseUrl: appBaseUrl() });
        subject = built.subject;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: b.guest_email,
          subject: built.subject,
          html: built.html,
          text: built.text,
        });
        await logEmailAttempt(base44, {
          booking_id: b.id, recipient: b.guest_email,
          template: "consent_request", subject: built.subject, ok: true, error: null,
        });
        // Set the flag ONLY on success — a failure retries the next day.
        await base44.asServiceRole.entities.Booking.update(b.id, { consent_email_sent: true });
        sent++;
      } catch (e) {
        await logEmailAttempt(base44, {
          booking_id: b.id, recipient: b.guest_email,
          template: "consent_request", subject, ok: false, error: e?.message || String(e),
        }).catch(() => {});
        failed++;
      }
    }
    return Response.json({ ok: true, sent, failed, skipped, due: due.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}