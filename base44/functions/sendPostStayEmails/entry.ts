import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { requireInternal } from "../../shared/internalCall.ts";
import { buildPostStayEmail } from "../../shared/bookingEmail.ts";
import { randomToken } from "../../shared/contacts.ts";
import { appBaseUrl } from "../../shared/origin.ts";

// Daily 09:00 job — sends the post-stay thank-you + review request the morning
// after departure (1 day after, while the stay is still fresh). First-person,
// one "Leave a review" button, no consent ask (that moved to its own email 14
// days later, only to guests who left a review). Creates/updates a Contact so
// the later consent email has an unsubscribe_token to link to. Idempotent via
// post_stay_sent (set only on a successful send, so a failure retries next day).
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const _guard = await requireInternal(base44, req);
    if (_guard) return _guard;
    const today = new Date();
    const target = new Date(today.getTime() - 1 * 24 * 3600 * 1000);
    const targetStr = target.toISOString().slice(0, 10);

    const bookings = await base44.asServiceRole.entities.Booking.list(null, 500);
    const due = (bookings || []).filter(
      (b) =>
        b.departure_date === targetStr &&
        ["confirmed", "deposit_paid"].includes(b.status) &&
        !b.post_stay_sent &&
        b.guest_email
    );

    const contacts = await base44.asServiceRole.entities.Contact.list(null, 1000);

    let sent = 0;
    let failed = 0;
    for (const b of due) {
      try {
        // Ensure a contact exists (with an unsubscribe_token) so the later
        // consent email can link to /consent/<token>.
        let contact = (contacts || []).find((c) => c.email === b.guest_email);
        if (!contact) {
          contact = await base44.asServiceRole.entities.Contact.create({
            name: b.guest_name || "",
            email: b.guest_email,
            source: "past_guest",
            first_seen: b.arrival_date,
            last_stayed: b.departure_date,
            stays_count: 1,
            unsubscribe_token: randomToken(),
          });
          contacts.push(contact);
        }

        const { subject, text, html } = buildPostStayEmail({
          booking: b,
          appBaseUrl: appBaseUrl(),
        });
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: b.guest_email,
          subject,
          html,
          text,
        });
        await base44.asServiceRole.entities.Booking.update(b.id, { post_stay_sent: true });
        sent++;
      } catch {
        failed++;
      }
    }
    return Response.json({ ok: true, sent, failed, due: due.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}