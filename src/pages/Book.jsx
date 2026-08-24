import { useMemo, useState } from "react";
import { format, addDays, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import PageHero from "@/components/PageHero";
import StayCalendar, { stayForArrival, isParkClosedPeriod } from "@/components/StayCalendar";
import { STAYS, MAX_GUESTS, PARK_CLOSURE_DATE } from "@/lib/siteConfig";

const RATES_BY_MONTH = {
  9: { fri: 240, mon: 300 }, // Oct 2026
  10: { fri: 180, mon: 230 }, // Nov
  11: { fri: 180, mon: 230 }, // Dec
  0: { fri: 180, mon: 230 }, // Jan 2027
  1: { fri: 180, mon: 230 }, // Feb
  2: { fri: 260, mon: 320 }, // Mar
  3: { fri: 300, mon: 380 }, // Apr
};

function priceFor(arrival, stay) {
  const m = arrival.getMonth();
  const tier = RATES_BY_MONTH[m] || { fri: 240, mon: 300 };
  return stay.id === "fri" ? tier.fri : tier.mon;
}

export default function Book() {
  const [arrival, setArrival] = useState(null);
  const [guests, setGuests] = useState(2);
  const [details, setDetails] = useState({ name: "", email: "", phone: "", dogs: false });
  const [acknowledged, setAcknowledged] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);

  const stay = arrival ? stayForArrival(arrival) : null;
  const winter = arrival && isParkClosedPeriod(arrival);
  const departure = arrival && stay ? addDays(arrival, stay.nights) : null;
  const price = arrival && stay ? priceFor(arrival, stay) : 0;

  const canProceed = arrival && stay && guests <= MAX_GUESTS && details.name && details.email && (!winter || acknowledged);

  return (
    <div>
      <PageHero
        eyebrow="The Commitment"
        title="Book"
        subtitle="Choose your arrival, tell us who's coming, and see the price before you commit. The booking engine and payment step arrive shortly."
      />

      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-40">
        <div className="grid md:grid-cols-12 gap-12">
          {/* Left: calendar + guest details */}
          <div className="md:col-span-8">
            <p className="eyebrow mb-8">1 · Choose your arrival</p>
            <StayCalendar selectedArrival={arrival} onSelect={setArrival} />

            <div className="mt-16">
              <p className="eyebrow mb-6">2 · Guest details</p>
              <div className="grid sm:grid-cols-2 gap-6">
                <Field label="Full name" value={details.name} onChange={(v) => setDetails({ ...details, name: v })} />
                <Field label="Email" type="email" value={details.email} onChange={(v) => setDetails({ ...details, email: v })} />
                <Field label="Phone" value={details.phone} onChange={(v) => setDetails({ ...details, phone: v })} />
                <div>
                  <label className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-cornish-slate block mb-2">
                    Guests (max {MAX_GUESTS})
                  </label>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full bg-transparent border-b border-cornish-slate/30 py-3 text-atlantic focus:outline-none focus:border-gorse min-h-[44px]"
                  >
                    {Array.from({ length: MAX_GUESTS }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-3 sm:col-span-2 min-h-[44px] mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={details.dogs}
                    onChange={(e) => setDetails({ ...details, dogs: e.target.checked })}
                    className="w-5 h-5 accent-gorse"
                  />
                  <span className="text-cornish-slate">Bringing a dog (by prior arrangement)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right: summary */}
          <div className="md:col-span-4">
            <div className="sticky top-28 bg-salt border border-cornish-slate/20 p-8">
              <p className="eyebrow">Your stay</p>

              {!stay && (
                <p className="mt-6 text-cornish-slate">
                  Select a highlighted arrival date to begin. Only Friday (3 nights) and Monday (4 nights) arrivals within season are bookable.
                </p>
              )}

              {stay && (
                <div className="mt-6 space-y-4">
                  <div>
                    <p className="font-display text-3xl text-atlantic">{stay.label}</p>
                    <p className="font-mono text-sm text-cornish-slate mt-1">
                      {format(arrival, "EEE d MMM")} → {format(departure, "EEE d MMM yyyy")}
                    </p>
                  </div>
                  <div className="decking-divider" />
                  <Row label="Guests" value={`${guests}`} />
                  <Row label="Dog" value={details.dogs ? "Yes" : "No"} />
                  <div className="decking-divider" />
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-xs tracking-[0.15em] uppercase text-cornish-slate">Total</span>
                    <span className="font-display text-4xl text-atlantic">£{price}</span>
                  </div>
                  <p className="font-mono text-[0.6rem] tracking-[0.1em] text-cornish-slate/70">
                    Price shown before commitment. No payment taken yet.
                  </p>

                  {winter && (
                    <div role="alert" aria-live="assertive" className="bg-atlantic text-salt p-5">
                      <p className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-gorse">Winter residency disclosure</p>
                      <p className="mt-2 text-sm text-salt/90">
                        From {format(parseISO(PARK_CLOSURE_DATE), "d MMMM")} onwards, on-site park facilities (pool, club, entertainment) are closed. You are booking a peaceful, self-catered retreat.
                      </p>
                      <label className="flex items-start gap-3 mt-4 cursor-pointer min-h-[44px]">
                        <input
                          type="checkbox"
                          checked={acknowledged}
                          onChange={(e) => setAcknowledged(e.target.checked)}
                          className="w-5 h-5 mt-1 accent-gorse shrink-0"
                        />
                        <span className="text-sm text-salt">
                          I understand that I am booking a peaceful retreat and that park facilities are closed during this period.
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              <button
                disabled={!canProceed}
                onClick={() => setShowDisclosure(true)}
                className={`mt-8 w-full flex items-center justify-center px-6 py-4 font-mono text-xs tracking-[0.25em] uppercase transition-colors min-h-[44px] ${
                  canProceed
                    ? "bg-gorse text-atlantic hover:bg-atlantic hover:text-salt"
                    : "bg-cornish-slate/20 text-cornish-slate/50 cursor-not-allowed"
                }`}
              >
                {winter && !acknowledged ? "Acknowledge to continue" : "Review & Confirm"}
              </button>
              <p className="font-mono text-[0.6rem] tracking-[0.1em] text-cornish-slate/60 mt-4 text-center">
                Booking engine & payment arrive in the next step.
              </p>
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {showDisclosure && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-atlantic/80 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowDisclosure(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-salt max-w-lg w-full p-8 md:p-10"
            >
              <p className="eyebrow">Almost there</p>
              <h3 className="font-display text-3xl text-atlantic mt-3">Confirm your booking</h3>
              <div className="mt-6 space-y-2 font-mono text-sm text-cornish-slate">
                <Row label="Stay" value={stay?.label} />
                <Row label="Arrival" value={arrival && format(arrival, "EEE d MMM yyyy")} />
                <Row label="Departure" value={departure && format(departure, "EEE d MMM yyyy")} />
                <Row label="Guests" value={`${guests}`} />
                <Row label="Total" value={`£${price}`} />
              </div>
              <p className="mt-6 text-sm text-cornish-slate">
                The booking engine and secure payment step are being finalised. Your details have been prepared — you'll be able to complete payment shortly.
              </p>
              <button
                onClick={() => setShowDisclosure(false)}
                className="mt-8 w-full bg-atlantic text-salt py-4 font-mono text-xs tracking-[0.25em] uppercase hover:bg-cornish-slate transition-colors min-h-[44px]"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-cornish-slate block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-cornish-slate/30 py-3 text-atlantic focus:outline-none focus:border-gorse min-h-[44px]"
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="font-mono text-xs tracking-[0.15em] uppercase text-cornish-slate">{label}</span>
      <span className="text-atlantic">{value}</span>
    </div>
  );
}