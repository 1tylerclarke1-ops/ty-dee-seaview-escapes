import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHero from "@/components/PageHero";

// Public review page — reached from the post-stay email link. The booking id
// in the URL is what makes the review "verified" (linked to a real booking).
// The owner publishes it in admin; nothing shows on the site until then.
export default function Review() {
  const { reference } = useParams();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting || !text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("createReview", {
        reference,
        rating,
        text: text.trim(),
        guest_name: name.trim(),
      });
      if (res.data && res.data.ok === false) {
        setError(res.data.error || "Could not submit your review.");
      } else {
        setDone(true);
      }
    } catch {
      setError("Could not submit your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div>
        <PageHero title="Thank you" subtitle="Your review has been received and will appear on the site once we've published it." />
        <section className="px-6 md:px-10 max-w-[1400px] mx-auto py-16 text-center">
          <Link to="/" className="inline-flex items-center text-sea font-medium hover:text-sea-deep min-h-[44px]">
            Back to Ty Dee Seaview Escapes →
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div>
      <PageHero title="Review your stay" subtitle="A short, honest review helps other guests find us — and helps us keep the place right." />
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto py-16">
        <form onSubmit={submit} className="max-w-xl">
          <div className="mb-8">
            <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-3">Your rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="p-1"
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`w-8 h-8 ${(hover || rating) >= n ? "fill-signal text-signal" : "text-line"}`}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="mb-6">
            <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-2">Your name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border-b border-line py-3 text-ink focus:outline-none focus:border-sea min-h-[44px]"
            />
          </div>
          <div className="mb-6">
            <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-2">Your review</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              required
              className="w-full bg-transparent border-b border-line py-3 text-ink focus:outline-none focus:border-sea"
            />
          </div>
          {error && <p className="text-sm text-destructive mb-4">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className={`px-8 py-4 text-sm font-medium min-h-[44px] ${
              submitting || !text.trim() ? "bg-offseason text-muted-foreground cursor-not-allowed" : "bg-sea text-white hover:bg-sea-deep"
            }`}
          >
            {submitting ? "Submitting…" : "Submit your review"}
          </button>
        </form>
      </section>
    </div>
  );
}