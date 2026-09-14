import { useState, useEffect } from "react";
import { Star, Trash2, Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Admin — lists every review (verified and unverified), lets the owner
// publish/unpublish and delete. Only published AND verified reviews appear
// on the site; this is the single gate. Verified reviews come from the
// post-stay email link (linked to a real booking).
export default function ReviewsManager() {
  const [reviews, setReviews] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = () => {
    base44.entities.Review.list("-created_date", 200).then(setReviews).catch(() => setReviews([]));
  };
  useEffect(load, []);

  const toggle = async (r) => {
    setBusy(r.id);
    try {
      await base44.entities.Review.update(r.id, { published: !r.published });
      load();
    } finally {
      setBusy(null);
    }
  };
  const remove = async (r) => {
    if (!confirm("Delete this review permanently?")) return;
    setBusy(r.id);
    try {
      await base44.entities.Review.delete(r.id);
      load();
    } finally {
      setBusy(null);
    }
  };

  if (!reviews) return <p className="text-white/50 text-sm">Loading…</p>;
  if (!reviews.length) return <p className="text-white/50 text-sm">No reviews yet.</p>;

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div key={r.id} className="border border-white/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-signal text-signal" : "text-white/20"}`} strokeWidth={1.5} />
                  ))}
                </div>
                <span className="text-sm text-white">{r.guest_name}</span>
                <span className="text-xs text-white/40">{r.month_stayed}</span>
              </div>
              <p className="mt-3 text-sm text-white/70 leading-relaxed">{r.text}</p>
              <div className="mt-3 flex gap-3 text-xs">
                {r.verified ? (
                  <span className="text-sea">Verified · linked to a booking</span>
                ) : (
                  <span className="text-signal">Unverified</span>
                )}
                {r.published ? (
                  <span className="text-sea">Published</span>
                ) : (
                  <span className="text-white/40">Hidden</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => toggle(r)}
                disabled={busy === r.id}
                title={r.published ? "Unpublish" : "Publish"}
                className="p-2 text-white/60 hover:text-white border border-white/10 hover:border-white/30 disabled:opacity-40"
              >
                {r.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => remove(r)}
                disabled={busy === r.id}
                title="Delete"
                className="p-2 text-white/60 hover:text-signal border border-white/10 hover:border-signal disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}