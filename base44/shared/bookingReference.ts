// Human-readable booking reference: TD-YYMMDD-XXX.
//
// The database id is long, opaque, and looks like a system error when read
// aloud. This reference is what a guest or the owner actually quotes — in
// every email, on the confirmation and manage/cancel screens, in the admin
// bookings list, and in any export. The database id stays internal.
//
// Format: TD-YYMMDD-XXX, where YYMMDD is the booking creation date
// (Europe/London) and XXX is a 3-character code from an unambiguous alphabet
// (no O/0/I/1). Generated once at booking creation, stored on the Booking,
// and never changed. Uniqueness is checked against existing bookings at
// allocation time; on the vanishingly unlikely collision a longer code is
// used.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, no O/0/I/1

function yymmdd(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "2-digit", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (t) => (parts.find((p) => p.type === t) || {}).value || "";
  return `${get("year")}${get("month")}${get("day")}`;
}

function randomCode(len = 3) {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

// Format a reference for a given creation date. No uniqueness check — use
// allocateBookingReference() at booking creation for that.
export function formatBookingReference(date) {
  return `TD-${yymmdd(date)}-${randomCode()}`;
}

// Allocate a unique reference for a new booking. Queries existing bookings to
// avoid collisions, retrying with a fresh code. Pass the service-role base44
// client (the same one createCheckoutSession uses).
export async function allocateBookingReference(base44, date) {
  for (let i = 0; i < 12; i++) {
    const ref = formatBookingReference(date);
    const existing = await base44.asServiceRole.entities.Booking.filter({ reference: ref }).catch(() => []);
    if (!existing || !existing.length) return ref;
  }
  // Vanishingly unlikely — extend to a 4-char code.
  return `TD-${yymmdd(date)}-${randomCode(4)}`;
}