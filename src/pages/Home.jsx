import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDown, Waves, BedDouble, Wifi, PawPrint, Car, Eye } from "lucide-react";
import { BUSINESS } from "@/lib/siteConfig";

const HERO_IMG = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/eba602fdb_View.jpg";
const DECKING_IMG = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/939b9df1f_Decking.jpg";

const FEATURES = [
  { icon: BedDouble, label: "Sleeps six", note: "2 bedrooms + sofa bed" },
  { icon: Eye, label: "Sea views", note: "Private decking facing the Atlantic" },
  { icon: Wifi, label: "Free WiFi", note: "Stay connected if you must" },
  { icon: Car, label: "Free parking", note: "On-site at Polperro Holiday Park" },
  { icon: PawPrint, label: "Dogs welcome", note: "By prior arrangement" },
  { icon: Waves, label: "Coast path", note: "Minutes from the South West Coast Path" },
];

export default function Home() {
  return (
    <div>
      {/* Horizon Hero */}
      <section className="relative h-screen min-h-[640px] w-full overflow-hidden">
        <img src={HERO_IMG} alt="Sea view from the caravan decking at sunrise" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-atlantic/30 via-transparent to-atlantic/40" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="font-mono text-[0.7rem] md:text-xs tracking-[0.35em] uppercase text-salt/80"
          >
            Polperro Holiday Park · Cornwall
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.5 }}
            className="font-display text-salt text-6xl md:text-8xl lg:text-9xl leading-[0.95] mt-6"
          >
            Ty Dee
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="font-display italic text-salt/90 text-2xl md:text-4xl mt-4"
          >
            The Sea, Framed
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="mt-12"
          >
            <Link
              to="/book"
              className="inline-flex items-center gap-3 bg-gorse text-atlantic px-8 py-4 font-mono text-xs tracking-[0.25em] uppercase hover:bg-salt transition-colors min-h-[44px]"
            >
              Check Availability
            </Link>
          </motion.div>
        </div>
        <motion.button
          onClick={() => window.scrollTo({ top: window.innerHeight - 80, behavior: "smooth" })}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-salt/80 flex flex-col items-center gap-2"
          aria-label="Scroll to discover"
        >
          <span className="font-mono text-[0.6rem] tracking-[0.3em] uppercase">Scroll to discover</span>
          <ArrowDown className="w-4 h-4 animate-bounce" strokeWidth={1.25} />
        </motion.button>
      </section>

      {/* Short pitch */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-40">
        <div className="grid md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-4">
            <p className="eyebrow">The Retreat</p>
          </div>
          <div className="md:col-span-8">
            <p className="font-display text-3xl md:text-5xl text-atlantic leading-[1.15]">
              A privately owned static caravan perched above the Atlantic at Polperro — a quiet, refined base for six, where the view does the talking and the pace is set by the tide.
            </p>
            <div className="mt-10 decking-divider" />
            <div className="mt-10 grid sm:grid-cols-2 gap-6 text-cornish-slate">
              <p>{BUSINESS.bedrooms}. {BUSINESS.bathrooms}. Private decking with uninterrupted sea views, free WiFi, and on-site parking.</p>
              <p>Booked directly with the owner — no agency fees, no commission, just you and the coast. Two stay lengths, one season, one view.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Key features */}
      <section className="bg-atlantic text-salt">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32">
          <p className="eyebrow text-salt/50 mb-12">What's included</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-salt/10">
            {FEATURES.map((f) => (
              <div key={f.label} className="bg-atlantic p-8 md:p-10">
                <f.icon className="w-6 h-6 text-gorse mb-6" strokeWidth={1.25} />
                <p className="font-display text-2xl text-salt">{f.label}</p>
                <p className="font-mono text-[0.7rem] tracking-[0.1em] text-salt/50 mt-2">{f.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Decking feature */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-40">
        <div className="grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7">
            <img src={DECKING_IMG} alt="Private decking with sea view" className="w-full aspect-[3/2] object-cover" />
          </div>
          <div className="md:col-span-5">
            <p className="eyebrow">Private Decking</p>
            <h2 className="font-display text-4xl md:text-5xl text-atlantic mt-4 leading-tight">
              Your own horizon line
            </h2>
            <p className="mt-6 text-cornish-slate">
              Step out onto the private timber decking with a morning coffee and watch the mist lift off the Atlantic. The view is yours alone — no shared promenades, no crowds, just the slow theatre of the Cornish coast.
            </p>
            <Link to="/caravan" className="inline-flex mt-8 items-center gap-2 font-mono text-xs tracking-[0.25em] uppercase text-atlantic hover:text-gorse transition-colors min-h-[44px]">
              Explore the caravan →
            </Link>
          </div>
        </div>
      </section>

      {/* Availability CTA */}
      <section className="bg-gorse/15">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32 text-center">
          <p className="eyebrow">Season 2026 / 27</p>
          <h2 className="font-display text-4xl md:text-6xl text-atlantic mt-4 leading-tight">
            5 October 2026 — 27 April 2027
          </h2>
          <p className="mt-6 text-cornish-slate max-w-xl mx-auto">
            Two ways to stay: three nights arriving Friday, or four nights arriving Monday. The rest of the calendar is the sea's.
          </p>
          <Link
            to="/prices"
            className="inline-flex mt-10 items-center bg-atlantic text-salt px-8 py-4 font-mono text-xs tracking-[0.25em] uppercase hover:bg-cornish-slate transition-colors min-h-[44px]"
          >
            View Prices & Availability
          </Link>
        </div>
      </section>
    </div>
  );
}