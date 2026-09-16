// Central booking rules — shared by Prices & Availability and Book pages.

// Season window is derived from the pricing seasons (src/lib/pricing.js),
// the single source of truth. Re-exported here so existing imports work.
export { SEASON_START, SEASON_END } from "@/lib/pricing";

// JS getDay(): 0 = Sunday, 1 = Monday, 5 = Friday
// Stay lengths are now data-driven from BOOKING_RULES in src/lib/pricing.js.
export const MAX_GUESTS = 6;

export const SITE_ORIGIN = "https://tydeeseaviewescapes.co.uk";

export const NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "The Caravan", path: "/caravan" },
  { label: "Prices & Availability", path: "/prices" },
  { label: "Dog Friendly", path: "/dogs" },
  { label: "Guides", path: "/guides" },
  { label: "Reviews", path: "/reviews" },
  { label: "Find Us", path: "/find-us" },
  { label: "Terms & Conditions", path: "/terms" },
  { label: "Contact", path: "/contact" },
];

export const BUSINESS = {
  name: "Ty Dee Seaview Escapes",
  tagline: "The Sea, Framed",
  location: "Polperro, Looe, Cornwall",
  address: "Polperro Holiday Park, Polperro Road, Polperro, Looe, Cornwall",
  postcode: "PL13 2JE",
  sleeps: 6,
  bedrooms: "2 bedrooms plus sofa bed",
  bathrooms: "Family bathroom plus ensuite WC",
  email: "bookings@tydeeseaviewescapes.co.uk",
  phone: "+44 1503 000 000",
};