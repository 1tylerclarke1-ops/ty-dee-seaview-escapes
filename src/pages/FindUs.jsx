import { ExternalLink } from "lucide-react";
import PageHero from "@/components/PageHero";
import ParkMap from "@/components/ParkMap";
import Seo from "@/components/Seo";
import { lodgingSchema, SITE_ORIGIN } from "@/lib/structuredData";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const MAP_IMAGE = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/55b08392b_image.png";
const MAP_CREDIT = "Park map © Polperro Holiday Park";
// Pitch 157 marker — estimated from the park map. Verify against the printed
// map and adjust markerPos if the marker sits off pitch 157.
const MARKER_POS = { top: 44, left: 66 };

const PARK_COORDS = { lat: 50.34, lng: -4.548 };
const EMBED_SRC = `https://www.google.com/maps?q=${PARK_COORDS.lat},${PARK_COORDS.lng}&z=15&output=embed`;
const DIRECTIONS_URL = "https://www.google.com/maps/dir/?api=1&destination=Polperro+Holiday+Park,+Polperro+Road,+Polperro,+PL13+2JE";

const DRIVE_TIMES = [
  { from: "Plymouth", time: "45 min" },
  { from: "Exeter", time: "1 hr 20" },
  { from: "Bristol", time: "2 hr 30" },
  { from: "Birmingham", time: "3 hr 45" },
  { from: "London", time: "4 hr 15" },
  { from: "Manchester", time: "5 hr" },
];

const LAST_MILE = [
  "Leave the A38 at Trerulefoot, then take the A387 toward Looe and Polperro.",
  "The lanes near Polperro are narrow, with passing places — take them slowly.",
  "The park entrance is on the left coming from Looe, signposted from the A387.",
  "The site road is steep in places and can be slippery after winter rain.",
];

const AMENITIES = [
  "Reception", "Shop", "Bar & restaurant", "Indoor pool", "Arcade",
  "Crazy golf", "Launderette", "Dog walking area", "Car park", "EV charging point",
  "Dog waste — big bins down the road",
];

export default function FindUs() {
  return (
    <div>
      <Seo
        title="Find Us — Getting to Polperro Holiday Park & Finding the Van"
        description="How to get to Ty Dee at Polperro Holiday Park, Cornwall — drive times from Plymouth, Exeter, Bristol, Birmingham, London and Manchester, the last mile by car, trains to Looe, parking, and a park map to find pitch 157."
        canonical={`${SITE_ORIGIN}/find-us`}
        jsonLd={lodgingSchema()}
      />
      <PageHero
        title="Find Us"
        subtitle="Two jobs: getting to the park, and finding the van once you're inside. Here's both, honestly."
      />

      {/* 1 — GETTING HERE */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-8 md:pb-10">
        <h2 className="text-2xl md:text-3xl text-ink mb-6">Getting here</h2>
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          <div>
            <p className="text-sm text-muted-foreground mb-2">The address</p>
            <p className="text-base text-ink leading-relaxed">
              Polperro Holiday Park<br />
              Polperro Road<br />
              Polperro, Looe<br />
              Cornwall<br />
              PL13 2JE
            </p>
            <p className="mt-3 text-ink-soft text-sm">
              The park is signposted from the A387 between Looe and Polperro.
            </p>
            <a
              href={DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 bg-ink text-white px-5 py-2.5 text-sm font-medium hover:bg-ink-soft transition-colors min-h-[44px]"
            >
              Directions <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
            </a>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">On the map</p>
            <div className="w-full h-[260px] md:h-[320px] bg-offseason border border-line overflow-hidden">
              <iframe
                title="Map centred on Polperro Holiday Park entrance"
                src={EMBED_SRC}
                className="w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        {/* Drive times — tight two-column list */}
        <div className="mt-8">
          <h3 className="text-lg text-ink mb-1">Drive times</h3>
          <p className="text-sm text-ink-soft mb-3 max-w-2xl">
            Off-peak, sensible driving. Summer Saturdays are worse — add an hour or two, especially past Exeter.
          </p>
          <ul className="grid grid-cols-2 gap-x-10 gap-y-0 max-w-md text-sm">
            {DRIVE_TIMES.map((d) => (
              <li key={d.from} className="flex justify-between border-b border-line py-1.5">
                <span className="text-ink">{d.from}</span>
                <span className="text-ink tnum">{d.time}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* The last mile / By train / Parking — collapsed by default */}
        <Accordion type="single" collapsible className="mt-8">
          <AccordionItem value="last-mile">
            <AccordionTrigger className="text-base text-ink">The last mile</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 pt-1">
                {LAST_MILE.map((line) => (
                  <li key={line} className="text-ink-soft leading-relaxed pl-5 relative text-sm">
                    <span className="absolute left-0 text-sea">—</span>
                    {line}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="train">
            <AccordionTrigger className="text-base text-ink">By train</AccordionTrigger>
            <AccordionContent>
              <p className="text-ink-soft leading-relaxed text-sm">
                Looe station, on the branch line from Liskeard, is about 3 miles from the park. A taxi from the
                station is straightforward — there's usually one waiting, or the driver rings one — and costs
                around £12. Liskeard is on the main Penzance–London line, so you can change there from most of
                the country.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="parking">
            <AccordionTrigger className="text-base text-ink">Parking</AccordionTrigger>
            <AccordionContent>
              <p className="text-ink-soft leading-relaxed text-sm">
                Parking is free and right on the pitch — up to two cars. There's no separate car park to walk
                back from at night.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* 2 — FINDING THE VAN */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-8 md:pb-10">
        <div className="hairline pt-8 md:pt-10">
          <h2 className="text-2xl md:text-3xl text-ink mb-3">Finding the van</h2>
          <p className="text-ink-soft max-w-2xl mb-4 text-sm">
            The van is on pitch 157, marked on the map below. Tap it to zoom — it's detailed, and hard to read
            on a phone otherwise.
          </p>
          <ParkMap
            src={MAP_IMAGE}
            alt="Polperro Holiday Park site map showing the layout of pitches, facilities and pitch 157 highlighted"
            caption="Tap the map to zoom. Pitch 157 is marked in green."
            credit={MAP_CREDIT}
            markerPos={MARKER_POS}
          />
          <p className="mt-2 text-xs text-muted-foreground">{MAP_CREDIT}</p>

          {/* Walking in — prose, no heading */}
          <p className="mt-5 text-ink-soft leading-relaxed max-w-2xl text-sm">
            In through the entrance, past reception and the entertainment venue, then follow the road east
            through the park. Pitch 157 is toward the top right of the map, near the car park. It's a short
            walk from the entrance — five minutes at most.
          </p>

          {/* What's where — tight three-column list */}
          <h3 className="text-lg text-ink mt-6 mb-3">What's where on the park</h3>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5 max-w-3xl text-sm">
            {AMENITIES.map((a) => (
              <li key={a} className="text-ink-soft">{a}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground max-w-2xl">
            A 10 mph speed limit applies throughout the park — please keep to it. Between 1 November and 19
            March the indoor pool, bar and restaurant, shop, arcade, crazy golf and launderette close for
            winter; the dog walking area, car park and EV charging point stay open.
          </p>
        </div>
      </section>

      {/* After booking — kept as is */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-16 md:pb-20">
        <div className="bg-ink text-white p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl text-white">What you get after booking</h2>
          <p className="mt-4 text-white/70 max-w-2xl">
            The pitch number and this map stay public — they help you picture the stay. Your key
            arrangements, exact arrival instructions and our mobile number are sent in your arrival email,
            a few days before you come. Nothing arrives before then.
          </p>
        </div>
      </section>
    </div>
  );
}