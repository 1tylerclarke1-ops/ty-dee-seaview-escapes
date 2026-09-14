// Central booking rules — shared by Prices & Availability and Book pages.
// The booking engine itself is not built yet; these constants define the hard rules.

// Season window is derived from the pricing seasons (src/lib/pricing.js),
// the single source of truth. Re-exported here so existing imports work.
export { SEASON_START, SEASON_END } from "@/lib/pricing";

// JS getDay(): 0 = Sunday, 1 = Monday, 5 = Friday
export const STAYS = [
  { id: "fri", label: "3 nights · Fri–Mon", nights: 3, arrivalDay: 5 },
  { id: "mon", label: "4 nights · Mon–Fri", nights: 4, arrivalDay: 1 },
];

export const MAX_GUESTS = 6;

// From 1 November onwards on-site park facilities are closed.
export const PARK_CLOSURE_DATE = "2026-11-01";

export const NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "The Caravan", path: "/caravan" },
  { label: "Prices & Availability", path: "/prices" },
  { label: "The Area", path: "/area" },
  { label: "Book", path: "/book" },
  { label: "Terms & Conditions", path: "/terms" },
  { label: "Contact", path: "/contact" },
];

export const BUSINESS = {
  name: "Ty Dee Seaview Escapes",
  tagline: "The Sea, Framed",
  location: "Polperro Holiday Park, Cornwall",
  sleeps: 6,
  bedrooms: "2 bedrooms plus sofa bed",
  bathrooms: "Family bathroom plus ensuite WC",
  email: "stay@tydee.co.uk",
  phone: "+44 1503 000 000",
};