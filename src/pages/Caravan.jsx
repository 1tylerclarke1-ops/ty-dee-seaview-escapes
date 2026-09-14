import { useState } from "react";
import PageHero from "@/components/PageHero";
import { Image } from "@/components/ui/image";

const VIEW = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/eba602fdb_View.jpg";
const DECKING = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/939b9df1f_Decking.jpg";
const DECKING_VIEW = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/0ccdb513c_DeckingandView3.jpg";
const LIVING_DINING = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/697cab73e_LivingArea3.jpg";
const LIVING_SOFA = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/ecfdfe0eb_LivingArea4.jpg";
const DINING_NOOK = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/8bbe68b7b_LivingArea2.jpg";
const KITCHEN_DINING = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/8faf59b26_KitchenArea2.jpg";
const KITCHEN_DETAIL = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/c419496c6_KitchenArea.jpg";
const FLOOR_PLAN = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/c3f06d5c5_PlanLayout.jpg";

const ROOMS = [
  {
    no: "01",
    name: "The View",
    spec: "Atlantic horizon · framed from the decking",
    desc: "The reason Ty Dee exists. From your private decking the land rolls away to a calm band of sea and a wide Cornish sky — the horizon line that gives the caravan its name.",
    img: VIEW,
    wide: true,
  },
  {
    no: "02",
    name: "The Decking",
    spec: "Private balcony · 16'5 × 14'10 (5.01 × 4.52m)",
    desc: "Private timber decking with a modular rattan sofa and glass balustrade — your outdoor living room. Morning coffee, evening wine, and an uninterrupted view down over the park to the sea.",
    img: DECKING,
    wide: true,
  },
  {
    no: "03",
    name: "The Living Space",
    spec: "Open-plan lounge & dining · 18'9 × 11'9 (5.71 × 3.59m)",
    desc: "The heart of the caravan. An L-shaped sofa dressed in soft geometric cushions, an integrated electric fireplace, and floor-to-ceiling windows that pull the green hillside and sky indoors. The dining nook sits beside it for six.",
    img: LIVING_DINING,
    wide: true,
  },
  {
    no: "04",
    name: "The Lounge",
    spec: "L-shaped sofa · Electric fireplace · Bay windows",
    desc: "A calm corner to sink into. Light oak laminate bases, cream curtains, and a pitched ceiling with a central beam and recessed lighting. The view through the bay windows changes with the weather.",
    img: LIVING_SOFA,
    wide: false,
  },
  {
    no: "05",
    name: "The Dining Nook",
    spec: "Built-in bench · Light-oak table · Two stools",
    desc: "A dedicated dining nook with button-tufted bench seating and a light-oak pedestal table — comfortably seats four, with room to pull up a stool for more. Board games live in the media console nearby.",
    img: DINING_NOOK,
    wide: false,
  },
  {
    no: "06",
    name: "The Kitchen",
    spec: "Fully fitted · Gas range · Extractor · Air fryer · Microwave",
    desc: "Everything you need to cook a crab supper or a full English: a gas range with extractor hood, dark stone-effect worktops, and a full inventory of crockery and pans. A dining booth sits alongside for casual meals.",
    img: KITCHEN_DINING,
    wide: true,
  },
  {
    no: "07",
    name: "The Kitchen — Detail",
    spec: "L-shape · Mixer tap · Fire extinguisher · No-smoking",
    desc: "The working end of the kitchen: light oak and matte white cabinetry, a stainless steel sink under the window, and an air fryer and microwave to hand. A glazed door leads out to the decking.",
    img: KITCHEN_DETAIL,
    wide: false,
  },
  {
    no: "08",
    name: "The Park Setting",
    spec: "Polperro Holiday Park · Quiet pitch · Sea-side",
    desc: "Ty Dee sits on a generous, peaceful pitch within Polperro Holiday Park, with a paved road winding through green lawns and neighbouring caravans down toward the coastal view. Quiet, green, and a short walk to the village.",
    img: DECKING_VIEW,
    wide: true,
  },
];

const PLAN_ROOMS = [
  { name: "Principal Bedroom", spec: "11'9 × 8'2 (3.59 × 2.50m)", note: "Double bed · ensuite WC access" },
  { name: "Bedroom 2", spec: "8'11 × 5'7 max (2.71 × 1.71m)", note: "Two singles · flexible for children or friends" },
  { name: "Family Bathroom", spec: "Shower · WC · Basin", note: "Full family bathroom, paired with the ensuite WC" },
  { name: "Total area", spec: "~447 sq ft / 41.5 sq m", note: "Ground floor · RICS / IPMS2 measured" },
];

export default function Caravan() {
  const [hovered, setHovered] = useState(null);

  return (
    <div>
      <PageHero
        eyebrow="The Sanctuary"
        title="The Caravan"
        subtitle="A walkthrough of every space — six sleeps across two bedrooms and a sofa bed, a view that follows you from the decking to the pillow."
      />

      {/* Overview image */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24">
        <Image
          src={VIEW}
          alt="The sea view from Ty Dee's decking"
          className="w-full aspect-[16/9] object-cover"
          fittingType="fill"
        />
      </section>

      {/* Room walkthrough */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-40">
        <div className="space-y-24 md:space-y-40">
          {ROOMS.map((room) => (
            <div key={room.no} className="grid md:grid-cols-12 gap-8 md:gap-12 items-center">
              <div className={room.wide ? "md:col-span-8" : "md:col-span-7"}>
                <div
                  className="relative group overflow-hidden"
                  onMouseEnter={() => setHovered(room.no)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <Image
                    src={room.img}
                    alt={room.name}
                    className={`w-full object-cover transition-transform duration-700 ${
                      room.wide ? "aspect-[16/9]" : "aspect-[4/3]"
                    } group-hover:scale-[1.02]`}
                    fittingType="fill"
                  />
                  <div
                    className={`absolute inset-0 bg-atlantic/80 flex items-center justify-center transition-opacity duration-500 ${
                      hovered === room.no ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="text-center px-6">
                      <p className="font-mono text-[0.6rem] tracking-[0.3em] uppercase text-gorse">Floor plan</p>
                      <p className="font-display text-2xl text-salt mt-2">
                        Room {room.no} · {room.name}
                      </p>
                      <p className="font-mono text-xs text-salt/60 mt-2">Position shown within the caravan layout</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className={room.wide ? "md:col-span-4" : "md:col-span-5"}>
                <p className="font-mono text-[0.65rem] tracking-[0.3em] text-gorse">Room {room.no}</p>
                <h2 className="font-display text-4xl md:text-5xl text-atlantic mt-3 leading-tight">{room.name}</h2>
                <p className="font-mono text-xs tracking-[0.1em] text-cornish-slate mt-3 uppercase">{room.spec}</p>
                <div className="mt-6 decking-divider" />
                <p className="mt-6 text-cornish-slate">{room.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Floor plan */}
      <section className="bg-atlantic text-salt">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32">
          <div className="grid md:grid-cols-12 gap-12 items-start">
            <div className="md:col-span-6">
              <p className="eyebrow text-salt/50">The layout</p>
              <h2 className="font-display text-4xl md:text-5xl text-salt mt-4 leading-tight">
                Floor plan & dimensions
              </h2>
              <p className="mt-6 text-salt/70 max-w-md">
                A single-storey ground-floor layout of approximately 447 sq ft. Two bedrooms and a sofa bed sleep six, with a family bathroom plus ensuite WC.
              </p>
              <div className="mt-8 bg-salt p-4 inline-block">
                <Image
                  src={FLOOR_PLAN}
                  alt="Ty Dee floor plan — Polperro Holiday Park"
                  className="w-full max-w-md bg-salt"
                  fittingType="fit"
                />
              </div>
              <p className="font-mono text-[0.6rem] tracking-[0.1em] text-salt/40 mt-3">
                For identification only — not to scale. RICS / IPMS2 Residential.
              </p>
            </div>
            <div className="md:col-span-6">
              <div className="space-y-px bg-salt/10">
                {PLAN_ROOMS.map((r) => (
                  <div key={r.name} className="bg-atlantic p-6 md:p-8">
                    <p className="font-display text-2xl text-salt">{r.name}</p>
                    <p className="font-mono text-xs tracking-[0.1em] text-gorse mt-2 uppercase">{r.spec}</p>
                    <p className="text-salt/60 text-sm mt-2">{r.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spec summary */}
      <section className="bg-salt">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28">
          <p className="eyebrow mb-10">At a glance</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-cornish-slate/15">
            {[
              ["Sleeps", "6"],
              ["Bedrooms", "2 + sofa bed"],
              ["Bathrooms", "Family + ensuite WC"],
              ["Decking", "Private, sea view"],
            ].map(([k, v]) => (
              <div key={k} className="bg-salt p-8">
                <p className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-cornish-slate">{k}</p>
                <p className="font-display text-3xl text-atlantic mt-3">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}