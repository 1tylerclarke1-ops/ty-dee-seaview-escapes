import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { base44 } from "@/api/base44Client";
import Photo from "@/components/Photo";
import Lightbox from "@/components/Lightbox";
import Seo from "@/components/Seo";
import Reviews from "@/components/Reviews";
import { BUSINESS } from "@/lib/siteConfig";
import { lodgingSchema, SITE_ORIGIN } from "@/lib/structuredData";

const BASE = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397";
const HERO = `${BASE}/eba602fdb_View.jpg`;
const EXTERIOR = `${BASE}/5f987f181_Coverpicture.jpg`;
const DECKING_VIEW = `${BASE}/23d07571c_DeckingandView.jpg`;
const LIVING = `${BASE}/697cab73e_LivingArea3.jpg`;
const BEDROOM = `${BASE}/3283e5042_MasterBedroom3.jpg`;

// Content photographs (the hero is not clickable). Order = lightbox order.
const PHOTOS = [
  { src: EXTERIOR, alt: "Ty Dee caravan on its elevated pitch at Polperro Holiday Park, wraparound timber deck and glass balustrade facing the sea", caption: "Ty Dee on its elevated pitch — wraparound timber deck and glass balustrade facing the Atlantic." },
  { src: DECKING_VIEW, alt: "An elevated corner of the decking looking out over the park toward the coast, outdoor sectional seating and a glass-topped table", caption: "An elevated corner of the decking, looking out over the park to the coast." },
  { src: LIVING, alt: "Open-plan lounge and dining area under a pitched ceiling with tall windows onto the green hillside", caption: "Open-plan lounge and dining under a pitched ceiling, tall windows to the hillside." },
  { src: BEDROOM, alt: "Principal bedroom with a double bed against a light-oak headboard panel and soft neutral linens", caption: "Principal bedroom — double bed, light-oak headboard, soft neutral linens." },
];

const FACTS = [
  { big: "6", small: "sleeps" },
  { big: "2", small: "bedrooms" },
  { big: "Sea view", small: "from the decking" },
  { big: "Dogs", small: "welcome by arrangement" },
];

export default function Home() {
  const [lightbox, setLightbox] = useState(null); // index or null
  const [reviews, setReviews] = useState([]);
  const openAt = (i) => setLightbox(i);

  useEffect(() => {
    base44.functions
      .invoke("getPublishedReviews", {})
      .then((res) => setReviews((res.data || res).reviews || []))
      .catch(() => {});
  }, []);

  return (
    <div>
      <Seo
        title="Ty Dee Seaview Escapes — Sea-view caravan at Polperro, Cornwall"
        description="A privately owned static caravan at Polperro Holiday Park, Cornwall. Sleeps six, sea views, private decking, dog-friendly. Direct booking with the owner, October to April."
        canonical={`${SITE_ORIGIN}/`}
        jsonLd={lodgingSchema(reviews)}
      />
      {/* Hero — full-bleed sea view, cropped not stretched */}
      <section className="relative w-full h-[68vh] md:h-[88vh] min-h-[480px] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={HERO}
            alt="The Atlantic horizon seen from the caravan decking at Polperro, calm sea and a wide Cornish sky"
            fittingType="fill"
            loading="eager"
            fetchpriority="high"
            className="block w-full h-full"
          />
        </div>
        <div className="absolute inset-0 scrim-bottom" />
        <div className="absolute inset-0 grain" />
        <div className="relative h-full flex flex-col items-center justify-end md:justify-center text-center px-6 pb-16 md:pb-0">
          <h1 className="text-white text-5xl md:text-7xl leading-[1.02]">Ty Dee Seaview Escapes</h1>
          <p className="mt-5 text-lg md:text-2xl text-white/90 max-w-xl">
            A sea-view caravan for six at Polperro — October to April, when the coast belongs to you.
          </p>
          <Link
            to="/prices"
            className="mt-8 inline-flex items-center bg-sea text-white px-8 py-4 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            See available dates
          </Link>
        </div>
      </section>

      {/* Contained pair — exterior + pitch (image left) */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-center">
          <div className="md:col-span-7">
            <Photo
              src={PHOTOS[0].src}
              alt={PHOTOS[0].alt}
              caption={PHOTOS[0].caption}
              onClick={() => openAt(0)}
              imgClassName="block w-full aspect-[4/3]"
            />
          </div>
          <div className="md:col-span-5">
            <h2 className="text-3xl md:text-5xl text-ink leading-tight">
              A quiet base above the Atlantic
            </h2>
            <p className="mt-5 text-ink-soft leading-relaxed">
              A privately owned static caravan perched above the sea at Polperro Holiday Park — sleeps six, with private decking, a sea view, and the South West Coast Path on the doorstep. Booked directly with the owner.
            </p>
            <Link
              to="/caravan"
              className="mt-6 inline-flex items-center text-sea font-medium hover:text-sea-deep transition-colors min-h-[44px]"
            >
              Explore the caravan →
            </Link>
          </div>
        </div>
      </section>

      {/* Dark facts band — large numerals, no photo */}
      <section className="bg-ink text-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
            {FACTS.map((f) => (
              <div key={f.small}>
                <p className="tnum text-4xl md:text-6xl text-white leading-none">{f.big}</p>
                <p className="mt-3 text-sm text-white/60">{f.small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full-bleed band — decking & view */}
      <section className="relative w-full h-[60vh] min-h-[360px] overflow-hidden">
        <button
          type="button"
          onClick={() => openAt(1)}
          aria-label={`Enlarge image: ${PHOTOS[1].alt}`}
          className="block w-full h-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sea"
        >
          <Image src={PHOTOS[1].src} alt={PHOTOS[1].alt} fittingType="fill" loading="lazy" className="block w-full h-full" />
        </button>
        <div className="absolute inset-0 scrim-bottom pointer-events-none" />
        <div className="absolute inset-0 flex items-end px-6 md:px-12 pb-10 pointer-events-none">
          <p className="text-white text-2xl md:text-4xl max-w-xl leading-tight">
            Your own horizon line — the view does the talking.
          </p>
        </div>
      </section>

      {/* Contained pair — living area (image right) */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-center">
          <div className="md:col-span-5 md:order-1">
            <h2 className="text-3xl md:text-5xl text-ink leading-tight">
              Warm, light, and built for the weather
            </h2>
            <p className="mt-5 text-ink-soft leading-relaxed">
              Open-plan living and dining under a pitched ceiling, with tall windows that pull the hillside indoors. An L-shaped sofa, an electric fireplace, and a dining nook for six — the space to dry out after a day on the coast path.
            </p>
          </div>
          <div className="md:col-span-7 md:order-2">
            <Photo
              src={PHOTOS[2].src}
              alt={PHOTOS[2].alt}
              caption={PHOTOS[2].caption}
              onClick={() => openAt(2)}
              imgClassName="block w-full aspect-[4/3]"
            />
          </div>
        </div>
      </section>

      {/* Full-bleed band — principal bedroom */}
      <section className="relative w-full h-[60vh] min-h-[360px] overflow-hidden">
        <button
          type="button"
          onClick={() => openAt(3)}
          aria-label={`Enlarge image: ${PHOTOS[3].alt}`}
          className="block w-full h-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sea"
        >
          <Image src={PHOTOS[3].src} alt={PHOTOS[3].alt} fittingType="fill" loading="lazy" className="block w-full h-full" />
        </button>
        <div className="absolute inset-0 scrim-bottom pointer-events-none" />
        <div className="absolute inset-0 flex items-end px-6 md:px-12 pb-10 pointer-events-none">
          <p className="text-white text-2xl md:text-4xl max-w-xl leading-tight">
            Sleep to the sound of the sea.
          </p>
        </div>
      </section>

      <Reviews reviews={reviews} />

      {/* CTA band */}
      <section className="bg-surface border-t border-line">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28 text-center">
          <p className="text-sm text-muted-foreground">Season 2026 / 27</p>
          <h2 className="mt-3 text-3xl md:text-5xl text-ink">5 October 2026 — 27 April 2027</h2>
          <p className="mt-5 text-ink-soft max-w-xl mx-auto">
            Two ways to stay: three nights arriving Friday, or four nights arriving Monday. The rest of the calendar is the sea's.
          </p>
          <Link
            to="/book"
            className="mt-8 inline-flex items-center bg-sea text-white px-8 py-4 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Begin your booking
          </Link>
        </div>
      </section>

      {lightbox !== null && (
        <Lightbox
          photos={PHOTOS}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndex={setLightbox}
        />
      )}
    </div>
  );
}