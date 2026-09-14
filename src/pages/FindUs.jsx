import { ExternalLink } from "lucide-react";
import PageHero from "@/components/PageHero";
import ParkMap from "@/components/ParkMap";
import Seo from "@/components/Seo";
import { lodgingSchema, SITE_ORIGIN } from "@/lib/structuredData";

const MAP_IMAGE = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/55b08392b_image.png";
const MAP_CREDIT = "Park map © Polperro Holiday Park";
// Pitch 157 marker — estimated from the park map. Verify against the printed
// map and adjust markerPos if the marker sits off pitch 157.
const MARKER_POS = { top: 38, left: 63 };

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

      <PartLabel part="Part one" title="Getting here" />

      {/* Address + embedded map */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-14 md:pb-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-16">
          <div>
            <p className="text-sm text-muted-foreground mb-3">The address</p>
            <p className="text-lg text-ink leading-relaxed">
              Polperro Holiday Park<br />
              Polperro Road<br />
              Polperro, Looe<br />
              Cornwall<br />
              PL13 2JE
            </p>
            <p className="mt-4 text-ink-soft">
              The park is signposted from the A387 between Looe and Polperro.
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-3">On the map</p>
            <div className="w-full h-[300px] md:h-[360px] bg-offseason border border-line overflow-hidden">
              <iframe
                title="Map centred on Polperro Holiday Park entrance"
                src={EMBED_SRC}
                className="w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <a
              href={DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 bg-ink text-white px-6 py-3 text-sm font-medium hover:bg-ink-soft transition-colors min-h-[44px]"
            >
              Directions <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </section>

      {/* Drive times */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-14 md:pb-20">
        <div className="hairline pt-10 md:pt-14">
          <h2 className="text-2xl md:text-3xl text-ink max-w-2xl">Drive times</h2>
          <p className="mt-3 text-ink-soft max-w-2xl">
            Off-peak, sensible driving. Summer Saturdays are worse — add an hour or two, especially past Exeter.
          </p>
          <div className="mt-6 max-w-md">
            <table className="w-full text-left">
              <tbody>
                {DRIVE_TIMES.map((d) => (
                  <tr key={d.from} className="border-b border-line">
                    <th scope="row" className="py-3 text-ink font-normal">{d.from}</th>
                    <td className="py-3 text-right text-ink tnum">{d.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* The last mile */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-14 md:pb-20">
        <div className="hairline pt-10 md:pt-14">
          <h2 className="text-2xl md:text-3xl text-ink max-w-2xl">The last mile</h2>
          <ul className="mt-5 space-y-3 max-w-2xl">
            {LAST_MILE.map((line) => (
              <li key={line} className="text-ink-soft leading-relaxed pl-5 relative">
                <span className="absolute left-0 text-sea">—</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* By train + parking */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-14 md:pb-20">
        <div className="hairline pt-10 md:pt-14 grid md:grid-cols-2 gap-8 md:gap-16">
          <div>
            <h2 className="text-2xl md:text-3xl text-ink">By train</h2>
            <p className="mt-4 text-ink-soft leading-relaxed">
              Looe station, on the branch line from Liskeard, is about 3 miles from the park. A taxi from the
              station is straightforward — there's usually one waiting, or the driver rings one — and costs
              around £12. Liskeard is on the main Penzance–London line, so you can change there from most of
              the country.
            </p>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl text-ink">Parking</h2>
            <p className="mt-4 text-ink-soft leading-relaxed">
              Parking is free and right on the pitch — up to two cars. There's no separate car park to walk
              back from at night.
            </p>
          </div>
        </div>
      </section>

      <PartLabel part="Part two" title="Finding the van" />

      {/* Park map */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-6">
        <p className="text-ink-soft max-w-2xl mb-5">
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
        <p className="mt-3 text-xs text-muted-foreground">{MAP_CREDIT}</p>
      </section>

      {/* Walking in */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-14 md:pb-20">
        <div className="hairline pt-10 md:pt-14">
          <h2 className="text-2xl md:text-3xl text-ink max-w-2xl">Walking in from the entrance</h2>
          <p className="mt-4 text-ink-soft leading-relaxed max-w-2xl">
            In through the entrance, past reception and the entertainment venue, then follow the road east
            through the park. Pitch 157 is toward the top right of the map, near the car park. It's a short
            walk from the entrance — five minutes at most.
          </p>
        </div>
      </section>

      {/* What's where */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-14 md:pb-20">
        <div className="hairline pt-10 md:pt-14">
          <h2 className="text-2xl md:text-3xl text-ink max-w-2xl">What's where on the park</h2>
          <ul className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 max-w-3xl">
            {AMENITIES.map((a) => (
              <li key={a} className="text-ink-soft">{a}</li>
            ))}
          </ul>
          <p className="mt-5 text-ink-soft max-w-2xl">
            A 10 mph speed limit applies throughout the park — please keep to it.
          </p>
          <p className="mt-4 text-ink-soft max-w-2xl">
            Between 1 November and 19 March the indoor pool, bar and restaurant, shop, arcade, crazy golf
            and launderette close for winter. The dog walking area, car park and EV charging point stay open.
          </p>
        </div>
      </section>

      {/* Dog waste */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-14 md:pb-20">
        <div className="hairline pt-10 md:pt-14">
          <h2 className="text-2xl md:text-3xl text-ink max-w-2xl">Dog waste</h2>
          <p className="mt-4 text-ink-soft leading-relaxed max-w-2xl">
            There's a bin right beside the van for dog waste — you can see it on the park map, next to pitch
            157. No long walk with a full bag.
          </p>
        </div>
      </section>

      {/* After booking */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-32">
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

function PartLabel({ part, title }) {
  return (
    <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-14 md:pb-20">
      <div className="hairline pt-10 md:pt-14">
        <p className="text-sm text-sea tracking-wide uppercase">{part}</p>
        <h2 className="text-3xl md:text-4xl text-ink mt-2">{title}</h2>
      </div>
    </section>
  );
}