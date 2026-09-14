// Public — returns a real XML sitemap (application/xml) listing every indexable
// page. Submit https://ty-dee-stays.base44.app/functions/getSitemap to Google
// Search Console. Update ORIGIN when a custom domain is connected.
const ORIGIN = "https://ty-dee-stays.base44.app";

const PAGES = [
  { path: "/", priority: "1.0", freq: "weekly" },
  { path: "/caravan", priority: "0.8", freq: "monthly" },
  { path: "/prices", priority: "0.8", freq: "daily" },
  { path: "/area", priority: "0.7", freq: "monthly" },
  { path: "/dogs", priority: "0.7", freq: "monthly" },
  { path: "/guides", priority: "0.7", freq: "weekly" },
  { path: "/guides/dog-friendly-cornwall", priority: "0.6", freq: "monthly" },
  { path: "/guides/polperro-in-winter", priority: "0.6", freq: "monthly" },
  { path: "/guides/coast-path-walks", priority: "0.6", freq: "monthly" },
  { path: "/guides/whats-open-off-season", priority: "0.6", freq: "monthly" },
  { path: "/terms", priority: "0.3", freq: "yearly" },
  { path: "/contact", priority: "0.5", freq: "monthly" },
];

export default async function () {
  const today = new Date().toISOString().slice(0, 10);
  const urls = PAGES.map(
    (p) =>
      `  <url><loc>${ORIGIN}${p.path}</loc><lastmod>${today}</lastmod><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority></url>`
  ).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}