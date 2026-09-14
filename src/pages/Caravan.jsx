import { useState } from "react";
import PageHero from "@/components/PageHero";
import { Image } from "@/components/ui/image";

const VIEW = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/eba602fdb_View.jpg";
const EXTERIOR = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/5f987f181_Coverpicture.jpg";
const DECKING = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/939b9df1f_Decking.jpg";
const DECKING_VIEW = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/23d07571c_DeckingandView.jpg";
const PARK_VIEW = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/0ccdb513c_DeckingandView3.jpg";
const LIVING_DINING = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/697cab73e_LivingArea3.jpg";
const LIVING_SIDE = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/9afaaa242_LivingArea.jpg";
const LIVING_SOFA = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/ecfdfe0eb_LivingArea4.jpg";
const DINING_BOOTH = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/6a24d7854_DiningArea.jpg";
const DINING_NOOK = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/8bbe68b7b_LivingArea2.jpg";
const KITCHEN_DINING = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/8faf59b26_KitchenArea2.jpg";
const KITCHEN_DETAIL = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/c419496c6_KitchenArea.jpg";
const MASTER = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/3283e5042_MasterBedroom3.jpg";
const MASTER_VANITY = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/92f0f5aea_MasterBedroom2.jpg";
const TWIN_1 = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/9cf5a2848_ChildrensBedroom.jpg";
const TWIN_2 = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/cb91c6670_ChildrensBedroom2.jpg";
const TWIN_3 = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/80a1061a0_MasterBedroom.jpg";
const BATHROOM = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/0021c9db6_Bathroom.jpg";
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
    name: "The Exterior",
    spec: "Cream 'Trieste' static · wraparound deck · elevated pitch",
    desc: "Ty Dee from the outside — a cream static caravan on a generous, elevated pitch within Polperro Holiday Park, with a wraparound timber deck and glass balustrade overlooking the green parkland toward the sea.",
    img: EXTERIOR,
    wide: true,
  },
  {
    no: "03",
    name: "The Decking",
    spec: "Private balcony · 16'5 × 14'10 (5.01 × 4.52m)",
    desc: "Private timber decking with a modular rattan sofa and glass balustrade — your outdoor living room. Morning coffee, evening wine, and an uninterrupted view down over the park to the sea.",
    img: DECKING,
    wide: true,
  },
  {
    no: "04",
    name: "The Decking & View",
    spec: "Elevated corner · outdoor sectional · glass-topped table",
    desc: "An elevated corner of the decking, looking out over the rolling park to the coast. Outdoor sectional seating and a glass-topped table for slow afternoons that turn into slow evenings.",
    img: DECKING_VIEW,
    wide: true,
  },
  {
    no: "05",
    name: "The Living Space",
    spec: "Open-plan lounge & dining · 18'9 × 11'9 (5.71 × 3.59m)",
    desc: "The heart of the caravan. An L-shaped sofa dressed in soft geometric cushions, an integrated electric fireplace, and floor-to-ceiling windows that pull the green hillside and sky indoors. The dining nook sits beside it for six.",
    img: LIVING_DINING,
    wide: true,
  },
  {
    no: "06",
    name: "The Lounge — Flow",
    spec: "Lounge to kitchen in one glance",
    desc: "The open-plan flow from lounge to kitchen: an L-shaped tufted sofa, the dining transition, and the galley kitchen beyond — all under a pitched ceiling with its central beam.",
    img: LIVING_SIDE,
    wide: false,
  },
  {
    no: "07",
    name: "The Lounge — Corner",
    spec: "L-shaped sofa · Electric fireplace · Bay windows",
    desc: "A calm corner to sink into. Light oak laminate bases, cream curtains, and a pitched ceiling with recessed lighting. The view through the bay windows changes with the weather.",
    img: LIVING_SOFA,
    wide: false,
  },
  {
    no: "08",
    name: "The Dining Nook",
    spec: "Tufted booth bench · Light-oak table · Window with sea sliver",
    desc: "A tufted booth bench and light-oak table set by the windows, with a sliver of sea on the horizon. Tied-back curtains and all-day light make every meal feel like a holiday.",
    img: DINING_BOOTH,
    wide: false,
  },
  {
    no: "09",
    name: "The Dining",
    spec: "Built-in bench · Light-oak table · Two stools",
    desc: "A dedicated dining nook with button-tufted bench seating and a light-oak pedestal table — comfortably seats four, with room to pull up a stool for more. Board games live in the media console nearby.",
    img: DINING_NOOK,
    wide: false,
  },
  {
    no: "10",
    name: "The Kitchen",
    spec: "Fully fitted · Gas range · Extractor · Air fryer · Microwave",
    desc: "Everything you need to cook a crab supper or a full English: a gas range with extractor hood, dark stone-effect worktops, and a full inventory of crockery and pans. A dining booth sits alongside for casual meals.",
    img: KITCHEN_DINING,
    wide: true,
  },
  {
    no: "11",
    name: "The Kitchen — Detail",
    spec: "L-shape · Mixer tap · Air fryer · Glazed door to decking",
    desc: "The working end of the kitchen: light oak and matte white cabinetry, a stainless steel sink under the window, and an air fryer and microwave to hand. A glazed door leads out to the decking.",
    img: KITCHEN_DETAIL,
    wide: false,
  },
  {
    no: "12",
    name: "Principal Bedroom",
    spec: "Double · 11'9 × 8'2 (3.59 × 2.50m) · Ensuite WC",
    desc: "The principal bedroom: a double bed against a light-oak headboard panel, soft neutral linens, and the ensuite WC visible through the open door — so the morning starts without a queue.",
    img: MASTER,
    wide: false,
  },
  {
    no: "13",
    name: "Principal Bedroom — Vanity",
    spec: "Built-in vanity · Mirror · Wardrobe",
    desc: "A second angle of the principal room — a built-in vanity with mirror and upholstered stool, and a tall wardrobe for a week's worth of walking gear and waterproofs.",
    img: MASTER_VANITY,
    wide: false,
  },
  {
    no: "14",
    name: "Bedroom 2 — Twin",
    spec: "Two singles · 8'11 × 5'7 max (2.71 × 1.71m)",
    desc: "The second bedroom: two single beds in fresh blue-and-white stripes, a shared light-oak headboard, and a central nightstand. Ideal for children or friends sharing.",
    img: TWIN_1,
    wide: false,
  },
  {
    no: "15",
    name: "Bedroom 2 — Window",
    spec: "Patterned curtains · Light-wood wardrobe · Hillside view",
    desc: "Another view of the twin room — patterned blue curtains, a light-wood wardrobe, and a window onto the green hillside beyond the park.",
    img: TWIN_2,
    wide: false,
  },
  {
    no: "16",
    name: "Bedroom 2 — Symmetry",
    spec: "Symmetrical twin · Cornflower-blue stripes",
    desc: "A symmetrical look down the twin room, both beds made up in cornflower-blue stripes beneath the caravan's pitched roofline.",
    img: TWIN_3,
    wide: false,
  },
  {
    no: "17",
    name: "The Family Bathroom",
    spec: "Glass shower · Pedestal basin · Framed mirror",
    desc: "The family bathroom: a glass-enclosed shower, pedestal basin, and a framed mirror. Bright, white, and functional — paired with the ensuite WC so six never feels like a bottleneck.",
    img: BATHROOM,
    wide: false,
  },
  {
    no: "18",
    name: "The Park Setting",
    spec: "Polperro Holiday Park · Quiet pitch · Sea-side",
    desc: "Ty Dee sits on a generous, peaceful pitch within Polperro Holiday Park, with a paved road winding through green lawns and neighbouring caravans down toward the coastal view. Quiet, green, and a short walk to the village.",
    img: PARK_VIEW,
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
          src={EXTERIOR}
          alt="Ty Dee caravan exterior on its pitch at Polperro Holiday Park"
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