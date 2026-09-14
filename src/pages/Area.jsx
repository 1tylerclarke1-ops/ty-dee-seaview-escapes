import PageHero from "@/components/PageHero";
import AreaMap, { SPOTS } from "@/components/AreaMap";
import ReservedSlot from "@/components/ReservedSlot";
import Seo from "@/components/Seo";
import { SITE_ORIGIN } from "@/lib/structuredData";

// Location cards drawn from the map pins. The caravan base is shown on the
// map only; these cards are the places a guest might walk or drive to.
const LOCATIONS = SPOTS.filter((s) => !s.isCaravan);

export default function Area() {
  return (
    <div>
      <Seo
        title="The Area — Polperro, Looe & the Cornish Coast"
        description="What's around Ty Dee Seaview Escapes at Polperro Holiday Park — the harbour, Looe, Talland Bay, the South West Coast Path and the coves of the south Cornish coast."
        canonical={`${SITE_ORIGIN}/area`}
      />
      <PageHero
        title="The Area"
        subtitle="Polperro, Looe, the coast path and a string of hidden coves — and a quieter, lovelier side of Cornwall once the crowds thin out."
      />

      {/* Embedded map centred on Polperro Holiday Park */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-16">
        <div className="h-[420px] md:h-[520px] border border-line overflow-hidden">
          <AreaMap />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Distances are approximate, by road. Tap a pin on the map for detail.
        </p>
      </section>

      {/* Location cards on --surface, each with a reserved image slot */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-32">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {LOCATIONS.map((spot) => (
            <article key={spot.id} className="bg-surface border border-line flex flex-col">
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
          ))}
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
            From November the holiday park quiets and the on-site facilities close — but the sea, the path and the pubs stay open. This is when Cornwall is at its most itself: empty beaches, roaring fires in village pubs, storm-watching from the decking, and a pace that remembers why you came.
          </p>
          <p className="mt-4 text-xs text-white/50">
            On-site park facilities are closed from 1 November. Bookings in this period are for a peaceful, self-catered retreat.
          </p>
        </div>
      </section>
    </div>
  );
}