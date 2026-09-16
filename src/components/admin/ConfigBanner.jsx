import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { PRICING_SETTINGS, BOOKING_RULES } from "@/lib/pricing";
import { pricingFingerprint } from "@/lib/pricingFingerprint";

// The admin dashboard runs the same client bundle as the public site, so it
// can compute the site's pricing fingerprint locally and compare it with the
// server's (returned by getAdminConfig) to surface config drift.
const CLIENT_PRICING_FINGERPRINT = pricingFingerprint(PRICING_SETTINGS, PRICING_SETTINGS.seasons, BOOKING_RULES);

// Shows owner-alert configuration health at the top of the admin dashboard.
// If OWNER_EMAIL is unset, a loud banner flags it as a configuration problem
// (owner alerts will not be delivered) rather than letting it fail silently.
export default function ConfigBanner() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions
      .invoke("getAdminConfig")
      .then((res) => setStatus(res.data || res))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !status) return null;

  const drift =
    !!status.server_pricing_fingerprint &&
    status.server_pricing_fingerprint !== CLIENT_PRICING_FINGERPRINT;

  if (drift) {
    return (
      <div className="mb-10 border border-destructive/50 bg-destructive/10 p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-white font-medium">Pricing config drift — server and site disagree</p>
          <p className="text-sm text-white/60 mt-1">
            The published site's pricing fingerprint doesn't match the server's, so bookings are being
            refused. Update the client mirror (<code className="text-white/80">src/lib/pricing.js</code>)
            to match <code className="text-white/80">base44/shared/</code>, then run{" "}
            <code className="text-white/80">npm run build</code> and publish.
          </p>
        </div>
      </div>
    );
  }

  if (status.owner_email_set === false) {
    return (
      <div className="mb-10 border border-signal/50 bg-signal/10 p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-signal flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-white font-medium">Configuration problem — owner alerts are off</p>
          <p className="text-sm text-white/60 mt-1">
            The <code className="text-white/80">OWNER_EMAIL</code> secret is not set, so no booking alerts will be
            delivered. Set it in Settings → Environment variables to the inbox you monitor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-10 border border-white/10 p-4 flex items-center gap-3">
      <CheckCircle2 className="w-4 h-4 text-sea flex-shrink-0" />
      <p className="text-sm text-white/60">
        Owner alerts → <span className="text-white/80 tnum">{status.owner_email_preview}</span>
      </p>
    </div>
  );
}