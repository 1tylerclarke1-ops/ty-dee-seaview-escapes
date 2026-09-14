import PageHero from "@/components/PageHero";
import AreaMap, { SPOTS } from "@/components/AreaMap";
import ReservedSlot from "@/components/ReservedSlot";
import Seo from "@/components/Seo";
import { SITE_ORIGIN } from "@/lib/structuredData";

const byTown = (town) => SPOTS.filter((s) => !s.isCaravan && s.town === town);
const LOOE = byTown("looe");
const POLPERRO = byTown("polperro");
const COAST = byTown("coast");

function SpotCard({ spot }) {
  return (
    <article className="bg-surface border border-line flex flex-col">
      {/*
        RESERVED IMAGE SLOT — awaiting a photograph of {spot.name}.
        Drop a file URL here when available. Never substitute a caravan
        photo or stock imagery for a location photo.
      */}
      <ReservedSlot label={spot.name} className="aspect-[3/2]" />
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-xl text-ink">{spot.name}</h3>
          <span className="text-xs text-sea tnum shrink-0">{spot.drive}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {spot.category}{spot.walk !== "—" ? ` · ${spot.walk} walk` : ""}
        </p>
        <p className="mt-3 text-sm text-ink-soft leading-relaxed flex-1">{spot.blurb}</p>
      </div>
    </article>
  );
}

function SpotGrid({ spots }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {spots.map((spot) => (
        <SpotCard key={spot.id} spot={spot} />
      ))}
    </div>
  );
}

// Marked slots for town content the owner will supply — recommending a place
// that has closed is worse than recommending none, so these stay empty until
// verified.
function TownSlot({ label, hint }) {
  return (
    <div className="bg-surface border border-line border-dashed p-6 md:p-8">
      <p className="text-sm text-sea tracking-wide uppercase">{label}</p>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{hint}</p>
    </div>
  );
}

export default function Area() {
  return (
    <div>
      <Seo
        title="The Area — Looe, Polperro & the Cornish Coast"
        description="What's around Ty Dee Seaview Escapes, a holiday caravan between Looe and Polperro — Looe's harbour, beach and island, Polperro's smuggling village, Talland Bay and the South West Coast Path."
        canonical={`${SITE_ORIGIN}/area`}
      />
      <PageHero
        title="The Area"
        subtitle="Ty Dee sits between Looe and Polperro, about ten minutes from each. Looe has the supermarket, the sandy beach, the station and the restaurants; Polperro has the harbour, the narrow streets and the smuggling history. You get both."
      />

      {/* Embedded map centred on the park */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-16">
        <div className="h-[420px] md:h-[520px] border border-line overflow-hidden">
          <AreaMap />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Drive times from the park, approximate. Tap a pin on the map for detail.
        </p>
      </section>

      {/* Looe — the town with everything open */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-20 md:pb-28">
        <div className="max-w-2xl mb-10">
          <p className="text-sm text-sea tracking-wide uppercase">Looe · 10 minutes</p>
          <h2 className="mt-3 text-3xl md:text-5xl text-ink leading-tight">The town with everything open</h2>
          <p className="mt-5 text-ink-soft leading-relaxed">
            Looe is the working town next door, and for most of what a guest actually needs — a supermarket, a sandy beach, a fishmonger, a railway station, restaurants that stay open year-round — it's the nearer of the two in practice. East and West Looe face each other across the river; the harbour sits between them.
          </p>
        </div>
        <SpotGrid spots={LOOE} />
      </section>

      {/* Polperro — the village cars can't reach */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-20 md:pb-28">
        <div className="max-w-2xl mb-10">
          <p className="text-sm text-sea tracking-wide uppercase">Polperro · 5 minutes</p>
          <h2 className="mt-3 text-3xl md:text-5xl text-ink leading-tight">The village cars can't reach</h2>
          <p className="mt-5 text-ink-soft leading-relaxed">
            Polperro is the postcard. Cars stop at the top of the village; from there it's all on foot, down narrow streets to a working fishing harbour built on smuggling. It's smaller than Looe and quieter out of season, and that's its charm — the harbour, the low-beamed pubs, the museum, the coast path climbing out either side.
          </p>
        </div>
        <SpotGrid spots={POLPERRO} />
      </section>

      {/* Coast & coves between */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-20 md:pb-28">
        <div className="max-w-2xl mb-10">
          <p className="text-sm text-sea tracking-wide uppercase">Coast & coves</p>
          <h2 className="mt-3 text-3xl md:text-5xl text-ink leading-tight">The path and the beaches between</h2>
          <p className="mt-5 text-ink-soft leading-relaxed">
            The South West Coast Path runs past the park gate. West is Talland Bay; east is Looe. The beaches in between are the ones you'll keep coming back to.
          </p>
        </div>
        <SpotGrid spots={COAST} />
      </section>

      {/* Town content — owner to supply verified names */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-20 md:pb-28">
        <div className="max-w-2xl mb-10">
          <p className="text-sm text-sea tracking-wide uppercase">Eating, drinking & what's open</p>
          <h2 className="mt-3 text-3xl md:text-5xl text-ink leading-tight">Where to eat, where the fires are</h2>
          <p className="mt-5 text-ink-soft leading-relaxed">
            These are the places we send our own guests. We're holding the slots until we've re-checked each one is still trading and still welcome — a recommendation for a restaurant that's closed is worse than none. If you're booking soon, ask us and we'll tell you what's open right now.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <TownSlot label="Where to eat in Looe" hint="Restaurants and cafés we rate, in East and West Looe — coming once verified." />
          <TownSlot label="Pubs with fires" hint="The Polperro and Looe pubs that keep the log fire lit through winter — coming once verified." />
          <TownSlot label="Fish off the boat" hint="Where and when to buy catch straight off the Looe quay — coming once verified." />
          <TownSlot label="What's open in winter" hint="Who stays open out of season in Looe and Polperro — coming once verified." />
        </div>
      </section>

      {/* Out of season — text only, no photo */}
      <section className="bg-ink text-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28">
          <p className="text-sm text-white/50">Out of season</p>
          <h2 className="mt-4 text-3xl md:text-5xl text-white max-w-2xl leading-tight">
            The coast at its most honest
          </h2>
          <p className="mt-6 text-white/80 max-w-2xl">
            From November the holiday park quiets and the on-site facilities close — but Looe stays open, the sea, the path and the pubs stay open, and Polperro keeps its lights on. This is when Cornwall is at its most itself: empty beaches, roaring fires in village pubs, storm-watching from the decking, and a pace that remembers why you came.
          </p>
          <p className="mt-4 text-xs text-white/50">
            On-site park facilities are closed from 1 November. Bookings in this period are for a peaceful, self-catered retreat.
          </p>
        </div>
      </section>
    </div>
  );
}