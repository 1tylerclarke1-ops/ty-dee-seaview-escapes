import { Link } from "react-router-dom";
import PageHero from "@/components/PageHero";
import Seo from "@/components/Seo";
import { SITE_ORIGIN } from "@/lib/structuredData";

const GUIDES = [
  {
    path: "/guides/dog-friendly-cornwall",
    title: "Dog-friendly Cornwall, from Polperro",
    desc: "Where to walk, swim and eat with your dog on the south Cornish coast — beaches, the coast path and pubs that mean it.",
  },
  {
    path: "/guides/polperro-in-winter",
    title: "Polperro in winter",
    desc: "Why the quiet months are the best ones here — stormy seas, empty harbours, and a village that still has its lights on.",
  },
  {
    path: "/guides/coast-path-walks",
    title: "Coast path walks from the park",
    desc: "Four walks you can start without a car — Polperro to Talland Bay, on to Looe, and up toward Fowey.",
  },
  {
    path: "/guides/whats-open-off-season",
    title: "What's open off-season",
    desc: "An honest guide to what's running from November to April — the park facilities close, but the village doesn't.",
  },
];

export default function GuidesIndex() {
  return (
    <div>
      <Seo
        title="Guides — Ty Dee Seaview Escapes"
        description="Honest, first-person guides to staying at Polperro off-season: dog-friendly Cornwall, winter in the village, coast path walks, and what's really open."
        canonical={`${SITE_ORIGIN}/guides`}
      />
      <PageHero
        title="Guides"
        subtitle="Written by the people who own the place. These are the pages we wish every guest had read before they booked."
      />
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {GUIDES.map((g) => (
            <Link
              key={g.path}
              to={g.path}
              className="block border-t border-line pt-6 hover:opacity-80 transition-opacity"
            >
              <h2 className="text-2xl md:text-3xl text-ink leading-tight">{g.title}</h2>
              <p className="mt-3 text-ink-soft leading-relaxed">{g.desc}</p>
              <p className="mt-4 text-sm text-sea font-medium">Read the guide →</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}