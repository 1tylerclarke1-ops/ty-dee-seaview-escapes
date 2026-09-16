import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import Seo from "@/components/Seo";
import PageHero from "@/components/PageHero";

export default function Reviews() {
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    base44.functions
      .invoke("getPublishedReviews", {})
      .then((res) => {
        if (!alive) return;
        const r = (res.data || res).reviews || [];
        setReviews(r);
      })
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, []);

  const count = reviews?.length || 0;
  const avg =
    count && reviews.reduce((s, r) => s + (r.rating || 0), 0) / count;

  return (
    <>
      <Seo
        title="Guest Reviews · Ty Dee Seaview Escapes"
        description="Verified guest reviews of stays at Ty Dee Seaview Escapes, a boutique static caravan in Polperro, Cornwall."
        canonical="/reviews"
      />

      <PageHero
        title="Guest Reviews"
        subtitle="Verified reviews from guests who stayed at Ty Dee Seaview Escapes in Polperro, Cornwall."
      />

      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-32">
        {reviews === null && !error && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-line border-t-sea rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <p className="text-muted-foreground py-24 text-center">
            Reviews couldn't be loaded just now. Please try again shortly.
          </p>
        )}

        {reviews !== null && count === 0 && (
          <p className="text-muted-foreground py-24 text-center">
            Reviews will appear here once our first verified guests have shared their stay.
          </p>
        )}

        {count > 0 && (
          <>
            <div className="flex items-baseline gap-4 pb-8 mb-10 border-b border-line">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${i < Math.round(avg) ? "fill-signal text-signal" : "text-line"}`}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground tnum">
                {avg.toFixed(1)} average · {count} verified {count === 1 ? "review" : "reviews"}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
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
                  <blockquote className="text-ink-soft leading-relaxed text-lg">
                    “{r.text}”
                  </blockquote>
                  <figcaption className="mt-4 text-sm text-muted-foreground">
                    {r.guest_name} · stayed {r.month_stayed}
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}