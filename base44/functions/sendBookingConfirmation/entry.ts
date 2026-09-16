import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  stayFacilitiesStatus,
  formatFacilitiesDate,
  addDaysIso,
  DEFAULT_FACILITIES_SETTINGS,
} from "../../shared/facilities.ts";
import {
  normalizePolicy,
  buildPolicyText,
  DEFAULT_CANCELLATION_POLICY,
  computeCoolingOffExpiry,
  formatCoolingOffExpiry,
} from "../../shared/cancellation.ts";
import { logEmailAttempt } from "../../shared/emailLog.ts";

// Builds (and optionally sends) the booking confirmation email. For any
// facilities-affected stay it states plainly that the park's on-site
// facilities are closed and the booking is for the accommodation only.
// send=false (default) returns the composed email for preview/testing with no
// side effects; send=true requires an admin caller and a guest email address.
// Reaching a non-registered guest address needs a connected custom domain.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const send = payload.send === true;

    let booking = null;
    if (payload.booking_id) {
      booking = await base44.asServiceRole.entities.Booking.get(payload.booking_id);
    } else if (payload.booking) {
      booking = payload.booking;
    }
    if (!booking || !booking.arrival_date || !booking.nights) {
      return Response.json(
        { error: "booking (with arrival_date + nights) required" },
        { status: 400 }
      );
    }

    const rows = await base44.asServiceRole.entities.FacilitiesSettings.list();
    const settings = (rows && rows[0]) || DEFAULT_FACILITIES_SETTINGS;
    const status = stayFacilitiesStatus(booking.arrival_date, booking.nights, settings);
    const affected = status.state !== "open";

    const policyRows = await base44.asServiceRole.entities.CancellationPolicy.list();
    const policy = policyRows && policyRows.length ? normalizePolicy(policyRows[0]) : DEFAULT_CANCELLATION_POLICY;
    const bookedAtMs = booking.created_date ? new Date(booking.created_date).getTime() : Date.now();
    const coolingOffExpiryMs = booking.cooling_off_expires_at
      ? new Date(booking.cooling_off_expires_at).getTime()
      : computeCoolingOffExpiry(bookedAtMs, booking.arrival_date, policy);
    const coolingOffDisplay = formatCoolingOffExpiry(coolingOffExpiryMs);

    const subject = `Your stay at Ty Dee Seaview Escapes — arriving ${booking.arrival_date}`;
    const lines = [
      `Hello ${booking.guest_name || ""},`,
      ``,
      `Your stay is confirmed: arriving ${booking.arrival_date}, ${booking.nights} night(s), ${booking.guests || ""} guest(s).`,
      ``,
      `Change your mind? You have a full refund until ${coolingOffDisplay} — cancel before then and everything you've paid comes back.`,
    ];
    if (affected) {
      lines.push(``);
      if (status.state === "closed") {
        lines.push(
          settings.facilities_winter_note ||
            "The park's on-site facilities are closed for these dates. Your booking is for the accommodation only."
        );
      } else if (status.direction === "opening") {
        lines.push(
          `The park's on-site facilities reopen on ${formatFacilitiesDate(status.boundaryDate)} — your booking is for the accommodation only before then.`
        );
      } else {
        lines.push(
          `The park's on-site facilities are open to ${formatFacilitiesDate(addDaysIso(status.boundaryDate, -1))} and closed from ${formatFacilitiesDate(status.boundaryDate)} — your booking is for the accommodation only from then.`
        );
      }
    }
    if (settings.facilities_list) {
      lines.push(``);
      lines.push(`When the park is open, on-site facilities include: ${settings.facilities_list}`);
    }
    const policyText = booking.cancellation_policy_text || buildPolicyText(policy);
    lines.push(``);
    lines.push(policyText);
    lines.push(``);
    lines.push(`Ty Dee Seaview Escapes — Polperro, Cornwall`);
    const emailText = lines.join("\n");

    let sendResult = null;
    let sent = false;
    if (send) {
      const user = await base44.auth.me();
      if (!user || user.role !== "admin") {
        return Response.json({ error: "Admin required to send" }, { status: 403 });
      }
      if (!booking.guest_email) {
        return Response.json({ error: "Guest email required to send" }, { status: 400 });
      }
      try {
        sendResult = await base44.asServiceRole.integrations.Core.SendEmail({
          to: booking.guest_email,
          subject,
          text: emailText,
        });
        sent = true;
        await logEmailAttempt(base44, {
          booking_id: booking.id, recipient: booking.guest_email,
          template: "booking_confirmation_guest", subject, ok: true, error: null,
        });
        await base44.asServiceRole.entities.Booking.update(booking.id, {
          confirmation_email_sent: true,
        }).catch(() => {});
        if (!booking.cooling_off_expires_at) {
          await base44.asServiceRole.entities.Booking.update(booking.id, {
            cooling_off_expires_at: new Date(coolingOffExpiryMs).toISOString(),
          }).catch(() => {});
        }
      } catch (e) {
        sendResult = { error: e.message };
        await logEmailAttempt(base44, {
          booking_id: booking.id, recipient: booking.guest_email,
          template: "booking_confirmation_guest", subject, ok: false, error: e.message,
        });
      }
    }

    return Response.json({
      ok: true,
      affected,
      state: status.state,
      openDate: status.openDate,
      subject,
      body: emailText,
      sent,
      sendResult,
      cooling_off_expires_at: new Date(coolingOffExpiryMs).toISOString(),
      cooling_off_expires_display: coolingOffDisplay,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}