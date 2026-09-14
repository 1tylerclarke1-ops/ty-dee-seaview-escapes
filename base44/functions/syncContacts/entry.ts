import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { normalizeEmail, randomToken } from "../../shared/contacts.ts";

// Rebuild the guest list from every Booking. Past guests come from bookings
// that reached deposit_paid or confirmed; enquiries from status enquiry.
// Deduplicates on email (case-insensitive). Preserves existing marketing
// consent — sync never grants or revokes consent, only updates stay stats.
// Admin-only; also called by the weekly job.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin required" }, { status: 403 });
    }

    const bookings = await base44.asServiceRole.entities.Booking.list("-arrival_date", 500);
    const byEmail = new Map();
    for (const b of bookings || []) {
      if (b.status === "cancelled") continue;
      const key = normalizeEmail(b.guest_email);
      if (!key) continue;
      if (!byEmail.has(key)) byEmail.set(key, []);
      byEmail.get(key).push(b);
    }

    let created = 0, updated = 0;
    for (const [email, rows] of byEmail) {
      const past = rows.filter((b) => ["deposit_paid", "confirmed"].includes(b.status));
      const enquiries = rows.filter((b) => b.status === "enquiry");
      const source = past.length ? "past_guest" : (enquiries.length ? "enquiry" : "manual");
      const months = [...new Set(
        past.map((b) => new Date(b.arrival_date + "T00:00:00Z").getUTCMonth() + 1)
      )];
      const stays_count = past.length;
      const total_spent = past.reduce((s, b) => s + (b.gross_revenue || 0), 0);
      const last_stayed = past.length
        ? past.map((b) => b.arrival_date).sort().pop()
        : null;
      const first_seen = rows
        .map((b) => b.created_date || b.arrival_date)
        .filter(Boolean)
        .sort()[0] || null;
      const has_dog = rows.some((b) => b.dogs);
      const party = rows.map((b) => b.guests || 0).reduce((a, b) => Math.max(a, b), 0) || null;
      const name = rows[0]?.guest_name || "";

      const existing = await base44.asServiceRole.entities.Contact.filter({ email });
      const ex = existing && existing[0];
      const data = {
        name, email,
        phone: ex?.phone || "",
        source,
        first_seen, last_stayed,
        stays_count, total_spent,
        has_dog, dog_count: has_dog ? 1 : 0,
        party_size_typical: party,
        months_stayed: months,
      };
      if (ex) {
        await base44.asServiceRole.entities.Contact.update(ex.id, data);
        updated++;
      } else {
        await base44.asServiceRole.entities.Contact.create({
          ...data,
          marketing_consent: false,
          unsubscribed: false,
          unsubscribe_token: randomToken(),
        });
        created++;
      }
    }

    return Response.json({ ok: true, created, updated, total: byEmail.size });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}