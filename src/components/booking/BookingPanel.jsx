import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { addDays, format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { useIsMobile } from "@/hooks/use-mobile";
import { MAX_GUESTS } from "@/lib/siteConfig";
import { PRICING_SETTINGS, calculatePrice, gbpMoney } from "@/lib/pricing";
import { useCancellationPolicy, cancellationDisplay } from "@/lib/cancellation";
import Stepper from "@/components/booking/Stepper";
import PriceBreakdown from "@/components/booking/PriceBreakdown";
import EnquiryForm from "@/components/booking/EnquiryForm";
import StickyTotalBar from "@/components/booking/StickyTotalBar";

// The inline booking panel — revealed under the selection once dates and a
// stay length are chosen. Guests and dogs steppers, live breakdown, short
// details form, and a mobile sticky total bar. No page navigation.
export default function BookingPanel({ arrival, length, affected }) {
  const isMobile = useIsMobile();
  const [guests, setGuests] = useState(2);
  const [dogs, setDogs] = useState(0);
  const [details, setDetails] = useState({ name: "", email: "", phone: "", address: "", message: "" });
  const [terms, setTerms] = useState(false);
  const [facilitiesAck, setFacilitiesAck] = useState(false);
  const [cancelAck, setCancelAck] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [sticky, setSticky] = useState(false);
  const breakdownRef = useRef(null);
  const utmRef = useRef({});
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    utmRef.current = {
      utm_source: p.get("utm_source") || "",
      utm_medium: p.get("utm_medium") || "",
      utm_campaign: p.get("utm_campaign") || "",
    };
  }, []);

  const breakdown = arrival && length ? calculatePrice(arrival, length, dogs) : null;
  const { settings: cancelPolicy } = useCancellationPolicy();
  const arrivalIso = arrival ? format(arrival, "yyyy-MM-dd") : null;
  const cancelInfo =
    arrivalIso && breakdown ? cancellationDisplay(arrivalIso, breakdown.total, cancelPolicy) : null;
  const pastFullRefund = !!cancelInfo?.pastFullRefund;
  const cancelPercent = cancelInfo?.currentTier?.refund_percent ?? 0;
  const coolingOffPhrase = cancelInfo?.coolingOff?.sevenDayException
    ? "24 hours before you arrive"
    : "48 hours";
  const canSubmit = !!(
    details.name &&
    details.email &&
    terms &&
    (!affected || facilitiesAck) &&
    (!pastFullRefund || cancelAck)
  );

  useEffect(() => {
    setConfirmed(false);
    setError(null);
  }, [arrival, length]);

  useEffect(() => {
    if (!isMobile || !breakdownRef.current) return;
    const el = breakdownRef.current;
    const obs = new IntersectionObserver(
      ([entry]) => setSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isMobile, arrival, length, dogs]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("validateBooking", {
        arrival_date: format(arrival, "yyyy-MM-dd"),
        nights: length,
      });
      if (res.data && !res.data.valid) {
        setError(res.data.errors?.[0] || "These dates aren't available.");
      } else {
        setConfirmed(true);
        // Record the contact + marketing consent (best-effort, never blocks the
        // confirmation). Consent is opt-in only — an unticked box stays false.
        const u = utmRef.current;
        const utm = [u.utm_source, u.utm_medium, u.utm_campaign].filter(Boolean).join("/");
        const acquisition_source = [details.how_heard, utm].filter(Boolean).join(" · ");
        base44.functions.invoke("captureEnquiry", {
          name: details.name, email: details.email, phone: details.phone,
          marketing_consent: marketing, consent_source: "checkout",
          party_size: guests, dogs, arrival_date: format(arrival, "yyyy-MM-dd"), nights: length,
          how_heard: details.how_heard, utm_source: u.utm_source, utm_medium: u.utm_medium, utm_campaign: u.utm_campaign,
          acquisition_source,
          cancellation_acknowledged: pastFullRefund && cancelAck,
          cancellation_acknowledged_at: pastFullRefund && cancelAck ? new Date().toISOString() : null,
        }).catch(() => {});
      }
    } catch (e) {
      setError("Could not check these dates. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!arrival || !length || !breakdown) return null;

  if (confirmed) {
    return (
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-32">
        <div className="bg-surface border border-line p-8 md:p-12 text-center">
          <p className="text-sm text-sea tracking-wide uppercase">Request received</p>
          <h2 className="text-3xl text-ink mt-3">
            Thank you, {details.name.split(" ")[0] || "we'll be in touch"}
          </h2>
          <p className="mt-4 text-ink-soft max-w-lg mx-auto">
            We've received your request for {length} nights, arriving {format(arrival, "EEE d MMM yyyy")}. We'll be in touch to confirm availability and arrange your {gbpMoney(breakdown.deposit)} deposit.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Planning your journey? <Link to="/find-us" className="text-sea underline">Find us</Link> — drive times, the last mile, and a map to the van.
          </p>
          <button
            type="button"
            onClick={() => setConfirmed(false)}
            className="mt-8 inline-flex items-center justify-center bg-ink text-white px-6 py-3 text-sm font-medium hover:bg-ink-soft transition-colors min-h-[44px]"
          >
            Make another request
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-32">
        <div className={`bg-surface border border-line p-6 md:p-10 ${isMobile && sticky ? "pb-24" : ""}`}>
          <div className="grid md:grid-cols-2 gap-10 md:gap-16">
            <div>
              <p className="text-sm text-muted-foreground mb-6">Your stay</p>
              <div className="space-y-6 max-w-xs">
                <Stepper label="Guests" value={guests} min={1} max={MAX_GUESTS} onChange={setGuests} />
                <div>
                  <Stepper label="Dogs" value={dogs} min={0} max={PRICING_SETTINGS.max_dogs} onChange={setDogs} />
                  <p className="mt-2 text-xs text-muted-foreground">By prior arrangement — we'll confirm when we accept your booking.</p>
                </div>
              </div>
              <div ref={breakdownRef} className="mt-8">
                <PriceBreakdown breakdown={breakdown} arrival={arrival} />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-6">Your details</p>
              <EnquiryForm
                details={details}
                setDetails={setDetails}
                terms={terms}
                setTerms={setTerms}
                facilitiesAck={facilitiesAck}
                setFacilitiesAck={setFacilitiesAck}
                marketing={marketing}
                setMarketing={setMarketing}
                affected={affected}
                pastFullRefund={pastFullRefund}
                cancelPercent={cancelPercent}
                coolingOffPhrase={coolingOffPhrase}
                cancelAck={cancelAck}
                setCancelAck={setCancelAck}
                canSubmit={canSubmit}
                submitting={submitting}
                onSubmit={handleSubmit}
                error={error}
              />
            </div>
          </div>
        </div>
      </section>
      {isMobile && sticky && (
        <StickyTotalBar total={breakdown.total} canSubmit={canSubmit} submitting={submitting} onSubmit={handleSubmit} />
      )}
    </>
  );
}