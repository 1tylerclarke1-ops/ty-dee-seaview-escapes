import { useEffect } from "react";

// Marks the current page noindex,nofollow for crawlers, and restores
// indexable behavior on unmount so public pages stay crawlable after
// navigation. Use the hook in pages with conditional returns; the default
// component is a drop-in for pages that render a single tree.
export function useNoIndex() {
  useEffect(() => {
    let el = document.head.querySelector('meta[name="robots"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "robots");
      document.head.appendChild(el);
    }
    el.setAttribute("content", "noindex, nofollow");
    return () => {
      el.setAttribute("content", "index, follow");
    };
  }, []);
}

export default function NoIndex() {
  useNoIndex();
  return null;
}