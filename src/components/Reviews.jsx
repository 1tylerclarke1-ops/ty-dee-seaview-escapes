import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Displays published, verified guest reviews. Fetches once on mount; renders
// nothing (no section) when there are no reviews yet, so the page never shows
// an empty "reviews" block. Used on the home page and the caravan page.
export default function Reviews({ limit = 6, reviews: preloaded }) {
  const [reviews, setReviews] = useState(preloaded || null);

  useEffect(() => {
    if (preloaded) return;
    let alive = true;
    base44.functions
      .invoke("getPublishedReviews", {})
      .then((res) => {
        if (!alive) return;
        const r = (res.data || res).reviews || [];
        setReviews(r.slice(0, limit));
      })
      .catch(() => alive && setReviews([]));
    return () => { alive = false; };
  }, [limit, preloaded]);

  if (!reviews || !reviews.length) return null;

  return (
    <section className="bg-surface border-t border-line">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28">
        <p className="text-sm text-muted-foreground">Verified guests</p>
        <h2 className="mt-2 text-3xl md:text-5xl text-ink">From people who stayed</h2>
        <div className="mt-10 grid md:grid-cols-2 gap-8 md:gap-12">
          {reviews.map((r) => (
            <figure key={r.id} className="border-l-2 border-sea/40 pl-6">
              <div className="flex gap-1 mb-3" aria-label={`${r.rating} out of 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < r.rating ? "fill-signal text-signal" : "text-line"}`}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <blockquote className="text-ink-soft leading-relaxed">“{r.text}”</blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">
                {r.guest_name} · stayed {r.month_stayed}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}