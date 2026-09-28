import { useEffect } from "react";
import { SITE_ORIGIN, SOCIAL_IMAGE } from "@/lib/siteConfig";

// Per-page SEO for a client-rendered SPA: sets <title>, meta description,
// canonical link, Open Graph + Twitter card tags, and injects JSON-LD
// structured-data scripts. Call once per page. OG/Twitter tags are updated
// on navigation so each page's preview card matches its own title and
// description; the social image is site-wide. JSON-LD is replaced (not
// duplicated) on re-renders and navigation.
const OG_DEFAULTS = {
  title: "Ty Dee Seaview Escapes — Looe & Polperro, Cornwall",
  description:
    "Sea-view caravan sleeping 6 between Looe and Polperro. Two dogs welcome, any size. Book direct — no agency fees.",
  siteName: "Ty Dee Seaview Escapes",
};

function setMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(key, data) {
  let el = document.getElementById(key);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = key;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export default function Seo({ title, description, canonical, jsonLd }) {
  useEffect(() => {
    const pageTitle = title || OG_DEFAULTS.title;
    const pageDesc = description || OG_DEFAULTS.description;
    const pageUrl = canonical || SITE_ORIGIN;

    if (pageTitle) document.title = pageTitle;
    setMeta("name", "description", pageDesc);
    setLink("canonical", canonical);

    // Open Graph
    setMeta("property", "og:title", pageTitle);
    setMeta("property", "og:description", pageDesc);
    setMeta("property", "og:url", pageUrl);
    setMeta("property", "og:image", SOCIAL_IMAGE);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", OG_DEFAULTS.siteName);

    // Twitter
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", pageTitle);
    setMeta("name", "twitter:description", pageDesc);
    setMeta("name", "twitter:image", SOCIAL_IMAGE);

    if (jsonLd) {
      const arr = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      arr.forEach((d, i) => setJsonLd(`seo-jsonld-${i}`, d));
    }
  }, [title, description, canonical, JSON.stringify(jsonLd)]);
  return null;
}