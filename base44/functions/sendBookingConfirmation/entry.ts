import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  stayFacilitiesStatus,
  DEFAULT_FACILITIES_SETTINGS,
} from "../../shared/facilities.ts";
import {
  normalizePolicy,
  DEFAULT_CANCELLATION_POLICY,
  computeCoolingOffExpiry,
} from "../../shared/cancellation.ts";
import { calculatePrice, isPayableInFullIso } from "../../shared/pricing.ts";
import { logEmailAttempt } from "../../shared/emailLog.ts";
import { appBaseUrl } from "../../shared/origin.ts";
import {
  ownerEmail,
  buildGuestConfirmationEmail,
  buildOwnerAlertEmail,
} from "../../shared/bookingEmail.ts";

// Builds (and optionally sends) the booking confirmation email — the SAME
// template used at payment time (paymentConfirmation.ts), so a resend is
// indistinguishable from the original. send=false (default) returns the
// composed email for preview/testing with no side effects; send=true requires
// an admin caller. target="guest" (default) resends the guest confirmation;
// target="owner" resends the owner alert. Reaching a non-registered address
// needs a connected custom domain.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    // Every path here (preview AND send) renders guest PII from a booking
    // fetched via asServiceRole, bypassing the admin-only RLS on Booking.
    // So require an admin caller up front — not only on the send=true path.
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin required" }, { status: 403 });
    }
    const payload = await req.json().catch(() => ({}));
    const send = payload.send === true;
    const target = payload.target === "owner" ? "owner" : "guest";

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

    const policyRows = await base44.asServiceRole.entities.CancellationPolicy.list();
    const policy = policyRows && policyRows.length ? normalizePolicy(policyRows[0]) : DEFAULT_CANCELLATION_POLICY;
    const bookedAtMs = booking.created_date ? new Date(booking.created_date).getTime() : Date.now();
    const coolingOffExpiryMs = booking.cooling_off_expires_at
      ? new Date(booking.cooling_off_expires_at).getTime()
      : computeCoolingOffExpiry(bookedAtMs, booking.arrival_date, policy);
    const coolingOffIso = new Date(coolingOffExpiryMs).toISOString();

    const facRows = await base44.asServiceRole.entities.FacilitiesSettings.list();
    const settings = (facRows && facRows[0]) || DEFAULT_FACILITIES_SETTINGS;

    const arrivalDate = new Date(booking.arrival_date + "T00:00:00Z");
    const breakdown = calculatePrice(arrivalDate, booking.nights, booking.dog_count || 0);
    if (!breakdown) return Response.json({ error: "Could not price the stay" }, { status: 400 });
    const payableInFull = isPayableInFullIso(booking.arrival_date);

    const base = appBaseUrl();
    let subject, text, html, recipient, template, flagField;
    if (target === "owner") {
      const o = buildOwnerAlertEmail({ booking, breakdown, payableInFull });
      subject = o.subject;
      text = o.text;
      html = null;
      recipient = ownerEmail();
      template = "booking_confirmation_owner";
      flagField = "owner_alert_sent";
    } else {
      const g = buildGuestConfirmationEmail({
        booking, breakdown, payableInFull, settings, coolingOffIso, appBaseUrl: base,
      });
      subject = g.subject;
      text = g.text;
      html = g.html;
      recipient = booking.guest_email;
      template = "booking_confirmation_guest";
      flagField = "confirmation_email_sent";
    }

    let sent = false;
    let sendResult = null;
    if (send) {
      if (!recipient) {
        return Response.json(
          { error: target === "owner" ? "OWNER_EMAIL is not configured — set it in Settings → Environment variables" : "Guest email address is missing on this booking" },
          { status: 400 }
        );
      }
      try {
        sendResult = await base44.asServiceRole.integrations.Core.SendEmail({
          to: recipient, subject, text, ...(html ? { html } : {}),
        });
        sent = true;
        await logEmailAttempt(base44, {
          booking_id: booking.id, recipient, template, subject, ok: true, error: null,
        });
        await base44.asServiceRole.entities.Booking.update(booking.id, {
          [flagField]: true,
        }).catch(() => {});
        if (target === "guest" && !booking.cooling_off_expires_at) {
          await base44.asServiceRole.entities.Booking.update(booking.id, {
            cooling_off_expires_at: coolingOffIso,
          }).catch(() => {});
        }
      } catch (e) {
        sendResult = { error: e.message };
        await logEmailAttempt(base44, {
          booking_id: booking.id, recipient, template, subject, ok: false, error: e.message,
        });
      }
    }

    return Response.json({
      ok: true, target, subject, body: text, sent, sendResult,
      cooling_off_expires_at: coolingOffIso,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}