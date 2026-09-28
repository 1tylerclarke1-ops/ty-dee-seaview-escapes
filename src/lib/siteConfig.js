// Central booking rules — shared by Prices & Availability and Book pages.

// Season window is derived from the pricing seasons (src/lib/pricing.js),
// the single source of truth. Re-exported here so existing imports work.
export { SEASON_START, SEASON_END } from "@/lib/pricing";

// JS getDay(): 0 = Sunday, 1 = Monday, 5 = Friday
// Stay lengths are now data-driven from BOOKING_RULES in src/lib/pricing.js.
export const MAX_GUESTS = 6;

export const SITE_ORIGIN = "https://tydeeseaviewescapes.co.uk";

// 1200×630 server-side crop of the sea-view photo for Open Graph / Twitter
// cards. Served on the fly by the Wix Media Platform (media.base44.com),
// so no separate file is stored. Absolute URL — social scrapers need it.
export const SOCIAL_IMAGE =
  "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/eba602fdb_View.jpg/v1/fill/w_1200,h_630,al_c,q_90/eba602fdb_View.jpg";

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
  email: "tydeeseaviewescapes@gmail.com",
  phone: "+44 1503 000 000",
};