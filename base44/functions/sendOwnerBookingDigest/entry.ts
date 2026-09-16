// Daily digest — sends the owner ONE email listing every paid booking not yet
// included in a digest, then marks those bookings as alerted. Replaces the old
// per-booking owner alert (one email per booking), so owner email volume is at
// most one per day regardless of how many bookings arrive, and the per-recipient
// email cap can never throttle a real alert. The admin dashboard's "new
// bookings since you last looked" indicator remains the primary, email-independent
// record. Runs as a scheduled job (no user context) via the service role.
//
// A failed/throttled digest is logged to EmailLog and flagged on AdminState so
// the dashboard can show it; the bookings themselves stay recorded regardless.
import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { logEmailAttempt } from "../../shared/emailLog.ts";
import { ownerEmail, formatGuestDate } from "../../shared/bookingEmail.ts";
import { appBaseUrl } from "../../shared/origin.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // Paid bookings not yet included in a digest.
    const all = await base44.asServiceRole.entities.Booking.list(null, 500);
    const pending = (all || []).filter(
      (b) => ["deposit_paid", "confirmed"].includes(b.status) && !b.owner_alert_sent
    );

    if (!pending.length) {
      await recordDigest(base44, { ok: true, count: 0, error: null, sent: false });
      return Response.json({ ok: true, count: 0, sent: false });
    }

    pending.sort(
      (a, b) =>
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
    );

    const owner = ownerEmail();
    const subject = `${pending.length} new booking${pending.length === 1 ? "" : "s"} — daily digest`;
    const lines = [
      `${pending.length} new booking${pending.length === 1 ? "" : "s"} confirmed since the last digest:`,
      ``,
    ];
    for (const b of pending) {
      const arr = formatGuestDate(b.arrival_date);
      const paid = Number(b.deposit_paid) || 0;
      const total = Number(b.gross_revenue) || 0;
      const balanceDue = Math.max(total - paid, 0);
      const payNote =
        b.status === "confirmed"
          ? "paid in full"
          : `deposit paid; balance £${balanceDue.toFixed(2)} due`;
      lines.push(
        `• ${b.guest_name} (${b.guest_email || "no email"}) — arriving ${arr}, ${b.nights} night(s), ${b.guests || 0} guest(s). ${payNote}. Ref ${b.id}.`
      );
    }
    lines.push(``);
    lines.push(`View all bookings: ${appBaseUrl()}/admin`);
    lines.push(``);
    lines.push(`Ty Dee Seaview Escapes — Polperro, Looe, Cornwall`);
    const text = lines.join("\n");

    let ok = false;
    let err = null;
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
      // Mark every included booking as alerted so the next digest skips them.
      try {
        await base44.asServiceRole.entities.Booking.bulkUpdate(
          pending.map((b) => ({ id: b.id, owner_alert_sent: true }))
        );
      } catch {}
    }

    await recordDigest(base44, { ok, count: pending.length, error: ok ? null : err, sent: true });
    return Response.json({ ok: true, count: pending.length, sent: true, emailOk: ok, error: err });
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