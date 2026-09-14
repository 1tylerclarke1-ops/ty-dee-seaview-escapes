import { useState } from "react";
import PageHero from "@/components/PageHero";
import Photo from "@/components/Photo";
import Lightbox from "@/components/Lightbox";
import RoomSection from "@/components/RoomSection";
import GalleryGrid from "@/components/GalleryGrid";
import Seo from "@/components/Seo";
import Reviews from "@/components/Reviews";
import { SITE_ORIGIN } from "@/lib/structuredData";

const BASE = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397";

// Every photograph on this page, in display order. `index` is the lightbox
// position. Captions describe what is actually in the frame.
const ALL_PHOTOS = [
  { id: "exterior", src: `${BASE}/5f987f181_Coverpicture.jpg`, alt: "Ty Dee caravan on its elevated pitch at Polperro Holiday Park, wraparound timber deck and glass balustrade facing the sea", caption: "Ty Dee on its elevated pitch — wraparound timber deck and glass balustrade facing the Atlantic." },
  { id: "decking", src: `${BASE}/939b9df1f_Decking.jpg`, alt: "Private timber decking with a modular rattan sofa and glass balustrade", caption: "Private timber decking with a modular rattan sofa — the outdoor living room." },
  { id: "view", src: `${BASE}/eba602fdb_View.jpg`, alt: "The Atlantic horizon framed by the glass balustrade of the decking", caption: "The Atlantic horizon from the decking, framed by the glass balustrade." },
  { id: "living", src: `${BASE}/697cab73e_LivingArea3.jpg`, alt: "Open-plan lounge and dining area under a pitched ceiling with tall windows onto the green hillside", caption: "Open-plan lounge and dining under a pitched ceiling, tall windows to the hillside." },
  { id: "lounge-flow", src: `${BASE}/9afaaa242_LivingArea.jpg`, alt: "The flow from the L-shaped sofa through the dining area to the galley kitchen", caption: "The flow from lounge to kitchen — L-shaped sofa and dining transition." },
  { id: "dining-booth", src: `${BASE}/6a24d7854_DiningArea.jpg`, alt: "Tufted booth bench and light-oak table by the windows with a sliver of sea on the horizon", caption: "Tufted booth bench and light-oak table by the windows, a sliver of sea on the horizon." },
  { id: "kitchen", src: `${BASE}/8faf59b26_KitchenArea2.jpg`, alt: "Galley kitchen with gas range, extractor hood and dark stone-effect worktops, dining booth alongside", caption: "Galley kitchen with gas range, extractor and dark stone-effect worktops; dining booth alongside." },
  { id: "kitchen-detail", src: `${BASE}/c419496c6_KitchenArea.jpg`, alt: "Light-oak and matte-white cabinetry, stainless sink under the window, glazed door to the decking", caption: "Light-oak and matte-white cabinetry, stainless sink under the window, glazed door to the decking." },
  { id: "principal", src: `${BASE}/3283e5042_MasterBedroom3.jpg`, alt: "Principal bedroom with a double bed against a light-oak headboard panel and soft neutral linens", caption: "Principal bedroom — double bed against a light-oak headboard panel, soft neutral linens." },
  { id: "principal-vanity", src: `${BASE}/92f0f5aea_MasterBedroom2.jpg`, alt: "Built-in vanity with mirror and upholstered stool in the principal bedroom", caption: "Built-in vanity with mirror and upholstered stool in the principal bedroom." },
  { id: "twin", src: `${BASE}/9cf5a2848_ChildrensBedroom.jpg`, alt: "Second bedroom with two single beds in cornflower-blue stripes and a shared light-oak headboard", caption: "Second bedroom — two singles in cornflower-blue stripes, shared light-oak headboard." },
  { id: "twin-window", src: `${BASE}/cb91c6670_ChildrensBedroom2.jpg`, alt: "Second bedroom with patterned blue curtains, light-wood wardrobe and a window onto the green hillside", caption: "Second bedroom — patterned blue curtains, light-wood wardrobe, window to the green hillside." },
  { id: "bathroom", src: `${BASE}/0021c9db6_Bathroom.jpg`, alt: "Family bathroom with a glass-enclosed shower, pedestal basin and framed mirror", caption: "Family bathroom — glass-enclosed shower, pedestal basin, framed mirror." },
  { id: "floor-plan", src: `${BASE}/c02808269_PlanLayout.jpg`, alt: "Ty Dee floor plan — single-storey layout of approximately 447 square feet", caption: "Floor plan — single-storey, ~447 sq ft, two bedrooms and a sofa bed." },
  { id: "decking-view", src: `${BASE}/23d07571c_DeckingandView.jpg`, alt: "Elevated corner of the decking looking out over the park to the coast, outdoor sectional and glass-topped table", caption: "Elevated corner of the decking, looking out over the park to the coast." },
  { id: "park-setting", src: `${BASE}/0ccdb513c_DeckingandView3.jpg`, alt: "The paved road winding through the green lawns of Polperro Holiday Park toward the coastal view", caption: "The paved road through the green lawns of Polperro Holiday Park toward the coastal view." },
  { id: "decking-view2", src: `${BASE}/e32785bb9_DeckingandView2.jpg`, alt: "Decking and view with outdoor sectional seating and a glass-topped table for slow afternoons", caption: "Decking and view — outdoor sectional and glass-topped table for slow afternoons." },
  { id: "lounge-corner", src: `${BASE}/ecfdfe0eb_LivingArea4.jpg`, alt: "Lounge corner with L-shaped sofa, electric fireplace and bay windows", caption: "Lounge corner — L-shaped sofa, electric fireplace, bay windows." },
  { id: "dining-nook", src: `${BASE}/8bbe68b7b_LivingArea2.jpg`, alt: "Dining nook with built-in bench seating and a light-oak pedestal table", caption: "Dining nook — built-in bench seating and light-oak pedestal table." },
  // NOTE: file named "MasterBedroom" but the frame shows the twin room (symmetrical view, cornflower-blue stripes). Pending owner confirmation.
  { id: "twin-symmetry", src: `${BASE}/80a1061a0_MasterBedroom.jpg`, alt: "Symmetrical view down the twin room, both beds made up in cornflower-blue stripes beneath the pitched roofline", caption: "Symmetrical view down the twin room — both beds in cornflower-blue stripes. (File named MasterBedroom — please confirm this is the twin room.)" },
].map((p, i) => ({ ...p, index: i }));

const byId = (id) => ALL_PHOTOS.find((p) => p.id === id);

const SECTIONS = [
  {
    title: "Arrival & decking",
    spec: "Wraparound timber deck · glass balustrade · sea-facing pitch",
    lead: byId("exterior"),
    supporting: [byId("decking"), byId("view")],
    paragraph:
      "Ty Dee sits on a generous, elevated pitch within Polperro Holiday Park, with a wraparound timber deck and glass balustrade overlooking the green parkland toward the sea. Step out with a morning coffee and watch the mist lift off the Atlantic — the view is yours alone.",
  },
  {
    title: "Living area",
    spec: "Open-plan lounge & dining · 5.71 × 3.59m",
    lead: byId("living"),
    supporting: [byId("lounge-flow"), byId("dining-booth")],
    paragraph:
      "The heart of the caravan. An L-shaped sofa, an electric fireplace, and tall windows that pull the hillside indoors. The dining nook sits beside it for six — board games in the media console for long evenings.",
  },
  {
    title: "Kitchen",
    spec: "Gas range · extractor · air fryer · full inventory",
    lead: byId("kitchen"),
    supporting: [byId("kitchen-detail")],
    paragraph:
      "Everything you need to cook a crab supper or a full English: a gas range with extractor, dark stone-effect worktops, and a full inventory of crockery and pans. A glazed door leads out to the decking.",
  },
  {
    title: "Principal bedroom",
    spec: "Double · 3.59 × 2.50m · ensuite WC access",
    lead: byId("principal"),
    supporting: [byId("principal-vanity")],
    paragraph:
      "A double bed against a light-oak headboard panel, soft neutral linens, and a built-in vanity with wardrobe. The ensuite WC opens off the room, so the morning starts without a queue.",
  },
  {
    title: "Second bedroom",
    spec: "Two singles · 2.71 × 1.71m",
    lead: byId("twin"),
    supporting: [byId("twin-window")],
    paragraph:
      "Two single beds in fresh cornflower-blue stripes with a shared light-oak headboard and a central nightstand. A light-wood wardrobe and a window onto the green hillside beyond the park.",
  },
  {
    title: "Bathroom",
    spec: "Glass shower · pedestal basin · framed mirror",
    lead: byId("bathroom"),
    supporting: [],
    paragraph:
      "The family bathroom: a glass-enclosed shower, pedestal basin, and a framed mirror. Bright, white, and functional — paired with the ensuite WC so six never feels like a bottleneck.",
  },
];

// Surplus photographs — shown only in the gallery grid at the foot of the page.
const GALLERY = ["decking-view", "park-setting", "decking-view2", "lounge-corner", "dining-nook", "twin-symmetry"].map(byId);

export default function Caravan() {
  const [lightbox, setLightbox] = useState(null);
  const openAt = (i) => setLightbox(i);

  return (
    <div>
      <Seo
        title="The Caravan — Ty Dee Seaview Escapes, Polperro"
        description="A walkthrough of the Ty Dee caravan at Polperro Holiday Park, between Looe and Polperro: open-plan living, galley kitchen, two bedrooms, family bathroom and ensuite, private sea-view decking. Sleeps six."
        canonical={`${SITE_ORIGIN}/caravan`}
      />
      <PageHero
        title="The Caravan"
        subtitle="A walkthrough of every space — six sleeps across two bedrooms and a sofa bed, a view that follows you from the decking to the pillow."
      />

      {/* Room-by-room walkthrough, in the order a guest walks through */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-20 md:pb-32">
        <div className="space-y-20 md:space-y-32">
          {SECTIONS.map((s) => (
            <RoomSection key={s.title} {...s} onOpen={openAt} />
          ))}
        </div>
      </section>

      {/* Floor plan — contained, centred, tappable to zoom */}
      <section className="bg-surface border-t border-b border-line">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28">
          <div className="max-w-[560px] mx-auto text-center">
            <h2 className="text-3xl md:text-4xl text-ink">Floor plan</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Single-storey, ~447 sq ft. Tap to zoom on a phone.
            </p>
            <div className="mt-8 bg-base p-4 block">
              <Photo
                src={byId("floor-plan").src}
                alt={byId("floor-plan").alt}
                onClick={() => openAt(byId("floor-plan").index)}
                imgClassName="block w-full aspect-[1357/1920]"
                fittingType="fit"
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">For identification only — not to scale.</p>
          </div>
        </div>
      </section>

      {/* Full gallery — uneven grid of the remaining photographs */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto py-20 md:py-28">
        <h2 className="text-3xl md:text-4xl text-ink mb-8">The full gallery</h2>
        <GalleryGrid photos={GALLERY} onOpen={openAt} />
      </section>

      <Reviews />

      {lightbox !== null && (
        <Lightbox
          photos={ALL_PHOTOS}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndex={setLightbox}
        />
      )}
    </div>
  );
}