import { useState } from "react";
import { useParams } from "react-router-dom";
import PageHero from "@/components/PageHero";
import { base44 } from "@/api/base44Client";

// One-click opt-in reached from the post-stay email. Asks permission to email
// occasionally about last-minute availability. Never pre-ticked — the guest
// clicks the button themselves. Keyed by the contact's token, not their email.
export default function Consent() {
  const { token } = useParams();
  const [state, setState] = useState("idle"); // idle | granting | granted | error

  const grant = async () => {
    setState("granting");
    try {
      const res = await base44.functions.invoke("grantMarketingConsent", { token });
      const d = res.data || res;
      if (d.ok) setState("granted");
      else setState("error");
    } catch {
      setState("error");
    }
  };

  return (
    <div>
      <PageHero
        title="Stay in the loop?"
        subtitle="We email occasionally — no more than once a month — when a stay opens up at Ty Dee. No schedules, no countdowns, just a quiet note when the dates are free."
      />
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-32">
        <div className="max-w-lg">
          {state === "granted" ? (
            <div className="bg-surface border border-line p-8 md:p-10">
              <p className="text-xs tracking-wide uppercase text-sea">Thank you</p>
              <p className="text-2xl text-ink mt-3">You're on the list.</p>
              <p className="mt-4 text-ink-soft">
                We'll only write when a stay genuinely opens up. You can unsubscribe any time — every email carries a one-click link.
              </p>
            </div>
          ) : (
            <>
              <p className="text-ink-soft">
                May we email you about last-minute availability at Ty Dee Seaview Escapes? One clear note when a stay is free, never more than once a month.
              </p>
              <button
                type="button"
                disabled={state === "granting"}
                onClick={grant}
                className="mt-8 bg-sea text-white px-8 py-4 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px] disabled:opacity-50"
              >
                {state === "granting" ? "Saving…" : "Yes, email me"}
              </button>
              {state === "error" && (
                <p className="mt-4 text-sm text-destructive">
                  We couldn't record that. The link may have expired — please email us and we'll add you.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}