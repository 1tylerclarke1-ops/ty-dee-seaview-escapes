// Segment definitions for the admin contact list. Mirrors the predicates in
// base44/shared/contacts.ts — keep in sync. SEGMENTS are the send targets
// (matched server-side with the consent gate); LIST_FILTERS add display-only
// filters for the contacts list.
const OFF_SEASON_MONTHS = [11, 12, 1, 2, 3];

export const SEGMENTS = [
  { id: "past_guests", label: "Past guests", test: (c) => (c.stays_count || 0) > 0 || c.source === "past_guest" },
  { id: "dog_owners", label: "Dog owners", test: (c) => !!c.has_dog },
  { id: "off_season", label: "Off-season bookers", test: (c) => Array.isArray(c.months_stayed) && c.months_stayed.some((m) => OFF_SEASON_MONTHS.includes(m)) },
  { id: "repeat_guests", label: "Repeat guests", test: (c) => (c.stays_count || 0) >= 2 },
  { id: "never_converted", label: "Never-converted enquiries", test: (c) => c.source === "enquiry" && !(c.stays_count > 0) },
];

export const LIST_FILTERS = [
  { id: "all", label: "All contacts", test: () => true },
  ...SEGMENTS,
  { id: "consented", label: "Marketing consented", test: (c) => !!c.marketing_consent && !c.unsubscribed },
  { id: "unsubscribed", label: "Unsubscribed", test: (c) => !!c.unsubscribed },
];

export const segmentLabel = (id) => SEGMENTS.find((s) => s.id === id)?.label || id;