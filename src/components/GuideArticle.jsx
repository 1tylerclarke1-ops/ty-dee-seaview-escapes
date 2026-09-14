import { Link } from "react-router-dom";
import PageHero from "@/components/PageHero";
import Seo from "@/components/Seo";
import { SITE_ORIGIN } from "@/lib/structuredData";

// Shared layout for the long-form guide pages: hero, article prose, and a
// quiet CTA back to availability. Written in the owner's first-person voice.
export default function GuideArticle({ title, subtitle, description, path, children }) {
  return (
    <div>
      <Seo
        title={`${title} — Ty Dee Seaview Escapes`}
        description={description}
        canonical={`${SITE_ORIGIN}${path}`}
      />
      <PageHero title={title} subtitle={subtitle} />
      <article className="px-6 md:px-10 max-w-[760px] mx-auto py-16 md:py-24">
        <div className="prose-tydee">{children}</div>
        <div className="mt-16 border-t border-line pt-10">
          <p className="text-ink-soft">Staying with us is the easiest way to see it for yourself.</p>
          <Link
            to="/prices"
            className="mt-4 inline-flex items-center bg-sea text-white px-8 py-4 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px]"
          >
            See available dates
          </Link>
        </div>
      </article>
    </div>
  );
}