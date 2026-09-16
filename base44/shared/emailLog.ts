// Log an email send attempt against a booking. Never throws — logging must
// not block a confirmation. Used by the payment-confirmation path and the
// admin resend so every send (success or failure) is auditable per booking:
// timestamp, recipient, template, status, and any error.
export async function logEmailAttempt(
  base44,
  { booking_id, recipient, template, subject, ok, error }
) {
  try {
    await base44.asServiceRole.entities.EmailLog.create({
      booking_id: booking_id || null,
      recipient: recipient || "",
      template: template || "",
      subject: subject || "",
      status: ok ? "sent" : "failed",
      error: ok ? null : (error || null),
      sent_at: new Date().toISOString(),
    });
  } catch {
    // Logging itself must never break the flow.
  }
}