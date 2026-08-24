import { useState } from "react";
import PageHero from "@/components/PageHero";
import { Image } from "@/components/ui/image";

const EXTERIOR = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/8d3edf957_generated_29f9dd84.png";
const MASTER = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/b54d2372a_generated_e51fa76a.png";
const LIVING = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/bc1119f08_generated_5f4ce5c6.png";
const DECKING = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/07cdba17a_generated_64dc4e54.png";

const ROOMS = [
  {
    no: "01",
    name: "The Master",
    spec: "Double · Coastal view · Ensuite WC",
    desc: "Crisp white linens, a window that frames the morning sea, and an ensuite WC so the day starts without a queue. Soft sage cushions echo the headland beyond the glass.",
    img: MASTER,
    wide: true,
  },
  {
    no: "02",
    name: "The Twin",
    spec: "Two singles · Flexible",
    desc: "A calm second bedroom with two single beds — ideal for children or friends. Neutral linens, generous storage, and the same quiet light that runs through the whole caravan.",
    img: EXTERIOR,
    wide: false,
  },
  {
    no: "03",
    name: "The Living Space",
    spec: "Lounge · Dining · Sofa bed (sleeps 2)",
    desc: "The heart of Ty Dee. A comfortable lounge that converts to sleep two, a dining table for six, and large windows that pull the horizon indoors. The kettle is always within reach of the view.",
    img: LIVING,
    wide: true,
  },
  {
    no: "04",
    name: "The Kitchen",
    spec: "Fully equipped · Gas hob · Oven · Fridge",
    desc: "Everything you need to cook a crab supper or a full English: full-sized oven and hob, fridge, microwave, and all the crockery and pans a family of six requires.",
    img: EXTERIOR,
    wide: false,
  },
  {
    no: "05",
    name: "The Family Bathroom",
    spec: "Shower · WC · Basin",
    desc: "A full family bathroom with a generous shower, WC and basin — paired with the master's ensuite WC, there's never a morning bottleneck for six.",
    img: MASTER,
    wide: false,
  },
  {
    no: "06",
    name: "The Decking",
    spec: "Private · Sea view · Outdoor seating",
    desc: "The reason you're here. Private timber decking with outdoor seating, facing the Atlantic. Sunrise coffee, sunset wine, and the sound of the sea as your only soundtrack.",
    img: DECKING,
    wide: true,
  },
];

export default function Caravan() {
  const [hovered, setHovered] = useState(null);

  return (
    <div>
      <PageHero
        eyebrow="The Sanctuary"
        title="The Caravan"
        subtitle="A walkthrough of every room — six sleeps, two bedrooms, a sofa bed, and a view that follows you from the decking to the pillow."
      />

      {/* Overview image */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24">
        <Image
          src={EXTERIOR}
          alt="Ty Dee caravan exterior"
          className="w-full aspect-[16/9] object-cover"
          fittingType="fill"
        />
      </section>

      {/* Room walkthrough */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-40">
        <div className="space-y-24 md:space-y-40">
          {ROOMS.map((room) => (
            <div
              key={room.no}
              className={`grid md:grid-cols-12 gap-8 md:gap-12 items-center ${
                room.wide ? "" : ""
              }`}
            >
              <div className={room.wide ? "md:col-span-8" : "md:col-span-7 md:col-start-1"}>
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

      {/* Spec summary */}
      <section className="bg-atlantic text-salt">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28">
          <p className="eyebrow text-salt/50 mb-10">At a glance</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-salt/10">
            {[
              ["Sleeps", "6"],
              ["Bedrooms", "2 + sofa bed"],
              ["Bathrooms", "Family + ensuite WC"],
              ["Decking", "Private, sea view"],
            ].map(([k, v]) => (
              <div key={k} className="bg-atlantic p-8">
                <p className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-salt/50">{k}</p>
                <p className="font-display text-3xl text-salt mt-3">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}