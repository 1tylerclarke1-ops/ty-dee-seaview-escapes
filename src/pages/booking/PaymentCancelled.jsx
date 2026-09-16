import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { SITE_ORIGIN } from "@/lib/structuredData";

// The Stripe cancel_url — the guest backed out of checkout. Their held booking
// remains for 30 minutes; after that the dates release automatically.
export default function PaymentCancelled() {
  return (
    <div>
      <Seo
        title="Payment cancelled — Ty Dee Seaview Escapes"
        description="Your payment was cancelled. Your dates are held for 30 minutes."
        canonical={`${SITE_ORIGIN}/booking/cancelled`}
      />
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto py-20 md:py-32">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-sm text-muted-foreground tracking-wide uppercase">Payment cancelled</p>
          <h1 className="text-4xl text-ink mt-3">No payment taken</h1>
          <p className="mt-5 text-ink-soft">
            You cancelled before any charge was made. Your dates are held for 30 minutes — complete payment before then or they'll be released for other guests.
          </p>
          <Link
            to="/prices"
            className="mt-8 inline-flex items-center justify-center bg-sea text-white px-6 py-3 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px]"
          >
            Back to prices
          </Link>
        </div>
      </section>
    </div>
  );
}