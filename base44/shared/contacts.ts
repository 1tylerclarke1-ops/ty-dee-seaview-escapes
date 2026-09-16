// Contact helpers — email normalisation, segment definitions, and the
// consent gate. Server-side. Segments are mirrored as predicates in
// src/lib/segments.js for the admin list — keep in sync.

const OFF_SEASON_MONTHS = [11, 12, 1, 2, 3];

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function randomToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Long, unguessable single-use token for a booking's manage/cancel link.
// 32 random bytes (256 bits) → 64 hex chars. The link opens one booking and
// only that booking — no account, no password. Set on every booking at
// creation; the manage page resolves the booking by this token alone.
export function bookingCancelToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const SEGMENTS = [
  { id: "past_guests", label: "Past guests", test: (c) => (c.stays_count || 0) > 0 || c.source === "past_guest" },
  { id: "dog_owners", label: "Dog owners", test: (c) => !!c.has_dog },
  { id: "off_season", label: "Off-season bookers", test: (c) => Array.isArray(c.months_stayed) && c.months_stayed.some((m) => OFF_SEASON_MONTHS.includes(m)) },
  { id: "repeat_guests", label: "Repeat guests", test: (c) => (c.stays_count || 0) >= 2 },
  { id: "never_converted", label: "Never-converted enquiries", test: (c) => c.source === "enquiry" && !(c.stays_count > 0) },
];

export function segmentById(id) {
  return SEGMENTS.find((s) => s.id === id) || null;
}

// Consent gate — enforced on every send. Never email without consent.
export function canEmail(c) {
  return !!c && !!c.email && !!c.marketing_consent && !c.unsubscribed;
}

export function filterSegment(contacts, segmentId) {
  const seg = segmentById(segmentId);
  if (!seg) return [];
  return contacts.filter((c) => seg.test(c) && canEmail(c));
}