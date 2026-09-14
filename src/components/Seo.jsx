import { useEffect } from "react";

// Per-page SEO for a client-rendered SPA: sets <title>, meta description,
// canonical link, and injects JSON-LD structured-data scripts. Call once per
// page. JSON-LD is replaced (not duplicated) on re-renders and navigation.
function setMeta(name, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
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
    if (title) document.title = title;
    setMeta("description", description);
    setLink("canonical", canonical);
    if (jsonLd) {
      const arr = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      arr.forEach((d, i) => setJsonLd(`seo-jsonld-${i}`, d));
    }
  }, [title, description, canonical, JSON.stringify(jsonLd)]);
  return null;
}