import { BUSINESS } from "@/lib/siteConfig";

export const SITE_ORIGIN = "https://ty-dee-stays.base44.app";

// schema.org LodgingBusiness (a LocalBusiness subtype) for the caravan.
// Reviews (when present) are folded in as aggregateRating + Review entries
// so star ratings can appear in search results.
export function lodgingSchema(reviews = []) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${SITE_ORIGIN}/#lodging`,
    name: BUSINESS.name,
    description:
      "A privately owned static caravan between Looe and Polperro, Cornwall. Sleeps six with sea views and private decking. Direct booking with the owner, all year round.",
    url: SITE_ORIGIN,
    image: `${SITE_ORIGIN}/og.jpg`,
    telephone: BUSINESS.phone,
    priceRange: "£70–£140",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Polperro Road, Polperro Holiday Park",
      addressLocality: "Polperro",
      addressRegion: "Cornwall",
      postalCode: "PL13 2JE",
      addressCountry: "GB",
    },
    geo: { "@type": "GeoCoordinates", latitude: 50.3398, longitude: -4.5145 },
    hasMap: `${SITE_ORIGIN}/find-us`,
    starRating: { "@type": "Rating", ratingValue: "5" },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Sea view", value: true },
      { "@type": "LocationFeatureSpecification", name: "Private decking", value: true },
      { "@type": "LocationFeatureSpecification", name: "Dog friendly", value: true },
      { "@type": "LocationFeatureSpecification", name: "Sleeps 6", value: true },
      { "@type": "LocationFeatureSpecification", name: "Wi-Fi", value: true },
      { "@type": "LocationFeatureSpecification", name: "Parking", value: true },
    ],
    knowsAbout: [
      "Dog friendly caravan holidays Cornwall",
      "Dog friendly Looe",
      "Looe and Polperro caravan hire",
      "Holiday caravan near Looe",
      "Polperro holiday park",
      "South West Coast Path",
      "Off-season Cornwall breaks",
    ],
  };

  if (reviews.length) {
    const avg = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length;
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avg.toFixed(1),
      reviewCount: String(reviews.length),
      bestRating: "5",
      worstRating: "1",
    };
    schema.review = reviews.slice(0, 8).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.guest_name },
      datePublished: r.created_date ? new Date(r.created_date).toISOString().slice(0, 10) : undefined,
      reviewRating: { "@type": "Rating", ratingValue: String(r.rating), bestRating: "5", worstRating: "1" },
      reviewBody: r.text,
    }));
  }
  return schema;
}