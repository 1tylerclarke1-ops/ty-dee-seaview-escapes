import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Seo from "@/components/Seo";
import { SITE_ORIGIN } from "@/lib/structuredData";

// The Stripe success_url. Retrieves the session server-side and verifies the
// payment before showing a confirmation. Never trusts the browser's word.
export default function PaymentReturn() {
  const [state, setState] = useState("loading"); // loading | confirmed | race_lost | already | error
  const [reference, setReference] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setState("error");
      return;
    }
    base44.functions
      .invoke("confirmPayment", { session_id: sessionId })
      .then((res) => {
        const data = res.data || res;
        if (data.confirmed) { setReference(data.reference); setState(data.balance_paid ? "balance_paid" : "confirmed"); }
        else if (data.already_confirmed) { setReference(data.reference); setState("already"); }
        else if (data.race_lost) setState("race_lost");
        else setState("error");
      })
      .catch(() => setState("error"));
  }, []);

  return (
    <div>
      <Seo
        title="Booking confirmation — Ty Dee Seaview Escapes"
        description="Your booking is confirmed and paid."
        canonical={`${SITE_ORIGIN}/booking/return`}
      />
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto py-20 md:py-32">
        <div className="max-w-xl mx-auto text-center">
          {state === "loading" && (
            <>
              <div className="w-8 h-8 border-4 border-line border-t-sea rounded-full animate-spin mx-auto" />
              <p className="mt-6 text-sm text-muted-foreground">Confirming your payment…</p>
            </>
          )}
          {state === "confirmed" && (
            <>
              <p className="text-sm text-sea tracking-wide uppercase">Booking confirmed</p>
              <h1 className="text-4xl text-ink mt-3">You're booked in</h1>
              {reference && <p className="mt-3 text-sm text-muted-foreground">Booking reference <span className="tnum text-ink">{reference}</span></p>}
              <p className="mt-5 text-ink-soft">
                Your payment has been received and your booking is confirmed. We've sent a confirmation email with your stay details and cooling-off deadline.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Planning your journey? <Link to="/find-us" className="text-sea underline">Find us</Link> — drive times, the last mile, and a map to the van.
              </p>
              <Link
                to="/"
                className="mt-8 inline-flex items-center justify-center bg-ink text-white px-6 py-3 text-sm font-medium hover:bg-ink-soft transition-colors min-h-[44px]"
              >
                Back to home
              </Link>
            </>
          )}
          {state === "balance_paid" && (
            <>
              <p className="text-sm text-sea tracking-wide uppercase">Balance paid</p>
              <h1 className="text-4xl text-ink mt-3">Your booking is fully confirmed</h1>
              {reference && <p className="mt-3 text-sm text-muted-foreground">Booking reference <span className="tnum text-ink">{reference}</span></p>}
              <p className="mt-5 text-ink-soft">
                Your balance has been received and your booking is now fully confirmed. We've sent you a confirmation email.
              </p>
              <Link
                to="/"
                className="mt-8 inline-flex items-center justify-center bg-ink text-white px-6 py-3 text-sm font-medium hover:bg-ink-soft transition-colors min-h-[44px]"
              >
                Back to home
              </Link>
            </>
          )}
          {state === "already" && (
            <>
              <p className="text-sm text-sea tracking-wide uppercase">Already confirmed</p>
              <h1 className="text-4xl text-ink mt-3">You're booked in</h1>
              {reference && <p className="mt-3 text-sm text-muted-foreground">Booking reference <span className="tnum text-ink">{reference}</span></p>}
              <p className="mt-5 text-ink-soft">
                Your booking is already confirmed and paid — no further action needed. We sent a confirmation email when your payment was first received.
              </p>
              <Link
                to="/"
                className="mt-8 inline-flex items-center justify-center bg-ink text-white px-6 py-3 text-sm font-medium hover:bg-ink-soft transition-colors min-h-[44px]"
              >
                Back to home
              </Link>
            </>
          )}
          {state === "race_lost" && (
            <>
              <p className="text-sm text-signal tracking-wide uppercase">We're sorry</p>
              <h1 className="text-4xl text-ink mt-3">Those dates were just taken</h1>
              <p className="mt-5 text-ink-soft">
                Another guest booked the same dates moments before your payment completed. We've refunded your card in full — the refund should appear within 5–10 working days. We've emailed you with alternative dates.
              </p>
              <Link
                to="/prices"
                className="mt-8 inline-flex items-center justify-center bg-sea text-white px-6 py-3 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px]"
              >
                Choose new dates
              </Link>
            </>
          )}
          {state === "error" && (
            <>
              <p className="text-sm text-signal tracking-wide uppercase">Checking your payment</p>
              <h1 className="text-4xl text-ink mt-3">We're checking now</h1>
              <p className="mt-5 text-ink-soft">
                We couldn't confirm your payment just now, but if your card was charged we'll have a record of it and will email you shortly. If you don't hear from us within an hour, please get in touch.
              </p>
              <Link
                to="/contact"
                className="mt-8 inline-flex items-center justify-center bg-ink text-white px-6 py-3 text-sm font-medium hover:bg-ink-soft transition-colors min-h-[44px]"
              >
                Contact us
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}