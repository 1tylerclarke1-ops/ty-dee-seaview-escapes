import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

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