import { useState, useEffect } from "react";
import { format, addDays, parseISO, isValid } from "date-fns";
import { Image } from "@/components/ui/image";
import StayCalendar from "@/components/StayCalendar";
import FacilitiesMarker from "@/components/FacilitiesMarker";
import { MAX_GUESTS } from "@/lib/siteConfig";
import { calculatePrice, gbp, allowedLengthsForArrival, isArrivalDay } from "@/lib/pricing";
import { useFacilitiesSettings, stayFacilitiesStatus, formatFacilitiesDate } from "@/lib/facilities";
import { base44 } from "@/api/base44Client";

const BASE = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397";
const BANNER = `${BASE}/5f987f181_Coverpicture.jpg`;

export default function Book() {
  const [arrival, setArrival] = useState(null);
  const [length, setLength] = useState(null);
  const [guests, setGuests] = useState(2);
  const [details, setDetails] = useState({ name: "", email: "", phone: "", dogs: false });
  const [facilitiesAck, setFacilitiesAck] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const { settings } = useFacilitiesSettings();

  // Pre-select from query params (arrival + nights passed from Prices & Availability).
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const a = urlParams.get("arrival");
    const n = urlParams.get("nights");
    if (a) {
      const d = parseISO(a);
      if (isValid(d) && isArrivalDay(d)) {
        setArrival(d);
        const allowed = allowedLengthsForArrival(d);
        const nn = Number(n);
        setLength(allowed.includes(nn) ? nn : allowed[0]);
      }
    }
  }, []);

  const allowedLengths = arrival ? allowedLengthsForArrival(arrival) : [];
  const facStatus = arrival && length ? stayFacilitiesStatus(arrival, length, settings) : null;
  const affected = facStatus && facStatus.state !== "open";
  const departure = arrival && length ? addDays(arrival, length) : null;
  const breakdown = arrival && length ? calculatePrice(arrival, length) : null;

  const canProceed =
    arrival && length && guests <= MAX_GUESTS && details.name && details.email;

  const handleSelectArrival = (d) => {
    setArrival(d);
    setValidationError(null);
    const allowed = allowedLengthsForArrival(d);
    setLength(allowed[0]);
  };

  // Server-side validation before confirming — rejects anything the rules
  // disallow (e.g. a 3- or 4-night stay in Peak summer) regardless of the
  // browser state.
  const handleConfirm = async () => {
    setValidating(true);
    setValidationError(null);
    try {
      const res = await base44.functions.invoke("validateBooking", {
        arrival_date: format(arrival, "yyyy-MM-dd"),
        nights: length,
      });
      if (res.data && !res.data.valid) {
        setValidationError(res.data.errors?.[0] || "This stay is not available.");
      } else {
        setShowDisclosure(true);
      }
    } catch (e) {
      setValidationError("Could not validate this stay. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div>
      {/* Narrow banner strip — no more than 220px */}
      <section className="relative w-full h-[220px] overflow-hidden">
        <Image
          src={BANNER}
          alt="Ty Dee caravan on its pitch at Polperro Holiday Park"
          fittingType="fill"
          loading="eager"
          className="block w-full h-full"
        />
        <div className="absolute inset-0 scrim-bottom" />
        <div className="relative h-full flex flex-col justify-end max-w-[1400px] mx-auto w-full px-6 md:px-10 pb-8">
          <h1 className="text-white text-4xl md:text-5xl">Book</h1>
          <p className="mt-2 text-white/80 max-w-xl text-sm md:text-base">
            Choose your arrival, pick a stay length, and see the price before you commit. The booking engine and payment step arrive shortly.
          </p>
        </div>
      </section>

      <section className="px-6 md:px-10 max-w-[1400px] mx-auto py-14 md:py-20 pb-24 md:pb-32">
        <div className="grid md:grid-cols-12 gap-8 md:gap-12">
          {/* Left: calendar + stay length + guest details */}
          <div className="md:col-span-8">
            <div className="bg-surface border border-line p-6 md:p-10">
              <p className="text-sm text-muted-foreground mb-6">1 · Choose your arrival</p>
              <StayCalendar selectedArrival={arrival} selectedLength={length} onSelect={handleSelectArrival} />

              {arrival && allowedLengths.length > 0 && (
                <div className="mt-10">
                  <p className="text-sm text-muted-foreground mb-4">Stay length</p>
                  <div className="flex flex-wrap gap-2">
                    {allowedLengths.map((n) => (
                      <button
                        key={n}
                        onClick={() => { setLength(n); setValidationError(null); }}
                        className={`px-5 py-3 text-sm tnum min-h-[44px] transition-colors ${
                          length === n
                            ? "bg-sea text-white"
                            : "bg-surface border border-line text-ink-soft hover:border-sea hover:text-sea"
                        }`}
                      >
                        {n} nights
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {affected && (
                <div role="alert" aria-live="polite" className="mt-10 bg-ink text-white p-6 md:p-8">
                  <p className="text-xs tracking-wide uppercase text-signal">Park facilities — read before booking</p>
                  <p className="mt-3 text-base text-white">
                    {facStatus.state === "closed"
                      ? settings.facilities_winter_note
                      : facStatus.direction === "opening"
                      ? `The park's facilities are closed until ${formatFacilitiesDate(facStatus.boundaryDate)} — this is Cornwall at its quietest, and priced accordingly.`
                      : `The park's facilities are open until ${formatFacilitiesDate(facStatus.boundaryDate)}, then closed for the rest of your stay — this is Cornwall at its quietest, and priced accordingly.`}
                  </p>
                  <p className="mt-3 text-sm text-white/80">
                    Your booking is for the caravan and your stay only — the on-site facilities (pool, club, entertainment) are not available{facStatus.state === "partial" ? ` ${facStatus.direction === "opening" ? "until" : "from"} ${formatFacilitiesDate(facStatus.boundaryDate)}` : ""}.
                  </p>
                </div>
              )}

              <div className="mt-12">
                <p className="text-sm text-muted-foreground mb-5">2 · Guest details</p>
                <div className="grid sm:grid-cols-2 gap-6">
                  <Field label="Full name" value={details.name} onChange={(v) => setDetails({ ...details, name: v })} />
                  <Field label="Email" type="email" value={details.email} onChange={(v) => setDetails({ ...details, email: v })} />
                  <Field label="Phone" value={details.phone} onChange={(v) => setDetails({ ...details, phone: v })} />
                  <div>
                    <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-2">
                      Guests (max {MAX_GUESTS})
                    </label>
                    <select
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="w-full bg-transparent border-b border-line py-3 text-ink focus:outline-none focus:border-sea min-h-[44px] tnum"
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
                      className="w-5 h-5 accent-sea"
                    />
                    <span className="text-ink-soft">Bringing a dog (by prior arrangement)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right: summary */}
          <div className="md:col-span-4">
            <div className="sticky top-28 bg-surface border border-line p-6 md:p-8">
              <p className="text-sm text-muted-foreground">Your stay</p>

              {!arrival && (
                <p className="mt-5 text-ink-soft text-sm">
                  Select a highlighted arrival date to begin. Available stay lengths will appear once you pick a date.
                </p>
              )}

              {arrival && length && (
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-2xl text-ink">{length} nights</p>
                    <p className="text-sm text-muted-foreground mt-1 tnum">
                      {format(arrival, "EEE d MMM")} → {format(departure, "EEE d MMM yyyy")}
                    </p>
                  </div>
                  <div className="hairline" />
                  <Row label="Guests" value={`${guests}`} />
                  <Row label="Dog" value={details.dogs ? "Yes" : "No"} />
                  <div className="hairline" />
                  {breakdown && (
                    <div className="space-y-2">
                      {breakdown.groups.map((g, i) => (
                        <div key={i} className="flex items-baseline justify-between">
                          <span className="text-sm text-ink-soft tnum">
                            {breakdown.groups.length > 1
                              ? `${g.count} × £${g.rate} ${g.type}`
                              : `${g.count} × £${g.rate} per night`}
                          </span>
                          <span className="text-sm text-ink tnum">{gbp(g.count * g.rate)}</span>
                        </div>
                      ))}
                      {breakdown.shortBreakSupplement > 0 && (
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-ink-soft">Short break supplement</span>
                          <span className="text-sm text-ink tnum">{gbp(breakdown.shortBreakSupplement)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="hairline mt-4" />
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs tracking-wide uppercase text-muted-foreground">Total</span>
                    <span className="text-3xl text-ink tnum">{breakdown ? gbp(breakdown.total) : "—"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Price shown before commitment. No payment taken yet.</p>

                  {affected && <FacilitiesMarker status={facStatus} />}

                  {validationError && (
                    <p className="text-sm text-destructive">{validationError}</p>
                  )}
                </div>
              )}

              <button
                disabled={!canProceed || validating}
                onClick={handleConfirm}
                className={`mt-6 w-full flex items-center justify-center px-6 py-4 text-sm font-medium transition-colors min-h-[44px] ${
                  canProceed && !validating
                    ? "bg-sea text-white hover:bg-sea-deep"
                    : "bg-offseason text-muted-foreground cursor-not-allowed"
                }`}
              >
                {validating ? "Checking…" : "Review & Confirm"}
              </button>
              <p className="text-xs text-muted-foreground mt-3 text-center">Booking engine & payment arrive in the next step.</p>
            </div>
          </div>
        </div>
      </section>

      {showDisclosure && (
        <div
          className="fixed inset-0 z-[70] bg-ink/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowDisclosure(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface max-w-lg w-full p-8 md:p-10 border border-line"
          >
            <p className="text-sm text-muted-foreground">Almost there</p>
            <h3 className="text-3xl text-ink mt-3">Confirm your booking</h3>
            <div className="mt-6 space-y-2 text-sm text-ink-soft">
              <Row label="Stay" value={`${length} nights`} />
              <Row label="Arrival" value={arrival && format(arrival, "EEE d MMM yyyy")} />
              <Row label="Departure" value={departure && format(departure, "EEE d MMM yyyy")} />
              <Row label="Guests" value={`${guests}`} />
              <Row label="Total" value={breakdown ? gbp(breakdown.total) : "—"} />
            </div>
            {affected && (
              <div className="mt-6 bg-offseason border border-line p-5">
                <p className="text-sm text-ink">
                  {facStatus.state === "closed"
                    ? "The park's on-site facilities are closed for these dates."
                    : facStatus.direction === "opening"
                    ? `The park's on-site facilities are closed until ${formatFacilitiesDate(facStatus.boundaryDate)}.`
                    : `The park's on-site facilities are open until ${formatFacilitiesDate(facStatus.boundaryDate)}, then closed.`}{" "}
                  This booking is for the accommodation only.
                </p>
                <label className="flex items-start gap-3 mt-4 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={facilitiesAck}
                    onChange={(e) => setFacilitiesAck(e.target.checked)}
                    className="w-5 h-5 mt-1 accent-sea shrink-0"
                  />
                  <span className="text-sm text-ink">
                    I understand the park's on-site facilities are closed for my dates and my booking is for the accommodation only.
                  </span>
                </label>
              </div>
            )}

            <p className="mt-6 text-sm text-ink-soft">
              The booking engine and secure payment step are being finalised. Your details have been prepared — you'll be able to complete payment shortly.
            </p>
            <button
              disabled={affected && !facilitiesAck}
              onClick={() => setShowDisclosure(false)}
              className={`mt-8 w-full py-4 text-sm font-medium transition-colors min-h-[44px] ${
                affected && !facilitiesAck
                  ? "bg-offseason text-muted-foreground cursor-not-allowed"
                  : "bg-ink text-white hover:bg-ink-soft"
              }`}
            >
              {affected && !facilitiesAck ? "Tick the box to confirm" : "Confirm booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-line py-3 text-ink focus:outline-none focus:border-sea min-h-[44px]"
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs tracking-wide uppercase text-muted-foreground">{label}</span>
      <span className="text-ink tnum">{value}</span>
    </div>
  );
}