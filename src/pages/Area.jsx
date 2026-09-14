import PageHero from "@/components/PageHero";
import { Image } from "@/components/ui/image";

const HARBOUR = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/e32785bb9_DeckingandView2.jpg";
const DECKING = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/0ccdb513c_DeckingandView3.jpg";

const PLACES = [
  {
    name: "Polperro",
    dist: "On your doorstep",
    desc: "A picture-postcard fishing village of narrow streets, whitewashed cottages and a working harbour. Wander at low tide, watch the boats, eat crab sandwiches. The caravan is inside Polperro Holiday Park, a short walk down to the village.",
  },
  {
    name: "Looe",
    dist: "10 minutes by car",
    desc: "The bustling twin town of East and West Looe, divided by the river. A working fishing port, a sandy beach, shark-fishing trips, and the best fish and chips on this stretch of coast.",
  },
  {
    name: "The South West Coast Path",
    dist: "Steps from the park",
    desc: "Some of the most dramatic clifftop walking in Britain leaves right from Polperro. Head west toward Talland Bay, or east toward Looe — both are spectacular in any weather.",
  },
  {
    name: "Beaches",
    dist: "5–20 minutes",
    desc: "Talland Bay, Looe, Lansallos, Seaton, Downderry — a string of coves and sandy stretches, each with its own character. Bring a towel and a sense of adventure.",
  },
];

export default function Area() {
  return (
    <div>
      <PageHero
        eyebrow="The Horizon Beyond"
        title="The Area"
        subtitle="Polperro, Looe, the coast path and a string of hidden coves — and a quieter, lovelier side of Cornwall once the season turns."
      />

      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24">
        <Image src={HARBOUR} alt="Polperro harbour at low tide" className="w-full aspect-[16/9] object-cover" fittingType="fill" />
      </section>

      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-40">
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-4">
            <p className="eyebrow">Where to go</p>
          </div>
          <div className="md:col-span-8 space-y-12">
            {PLACES.map((p, i) => (
              <div key={p.name} className="grid grid-cols-12 gap-6">
                <div className="col-span-12 sm:col-span-3">
                  <p className="font-mono text-[0.65rem] tracking-[0.25em] text-gorse">{String(i + 1).padStart(2, "0")}</p>
                </div>
                <div className="col-span-12 sm:col-span-9">
                  <h3 className="font-display text-3xl md:text-4xl text-atlantic">{p.name}</h3>
                  <p className="font-mono text-xs tracking-[0.1em] uppercase text-cornish-slate mt-2">{p.dist}</p>
                  <div className="mt-4 decking-divider" />
                  <p className="mt-4 text-cornish-slate">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Out of season */}
      <section className="bg-atlantic text-salt">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32">
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7">
              <Image src={DECKING} alt="Quiet winter decking" className="w-full aspect-[3/2] object-cover" fittingType="fill" />
            </div>
            <div className="md:col-span-5">
              <p className="eyebrow text-salt/50">Out of season</p>
              <h2 className="font-display text-4xl md:text-5xl text-salt mt-4 leading-tight">
                The coast at its most honest
              </h2>
              <p className="mt-6 text-salt/80">
                From November the holiday park quiets and the on-site facilities close — but the sea, the path and the pubs stay open. This is when Cornwall is at its most itself: empty beaches, roaring fires in village pubs, storm-watching from the decking, and a pace that remembers why you came.
              </p>
              <p className="mt-4 text-salt/60 font-mono text-xs tracking-[0.1em]">
                Note: on-site park facilities are closed from 1 November. Bookings in this period are for a peaceful, self-catered retreat.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}