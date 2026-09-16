import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export default function StripeConnectionPanel() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("stripeHealthCheck", {});
      setResult(res.data || res);
    } catch (e) {
      setResult({ connected: false, error: e?.message || "Request failed" });
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    if (result.connected && !result.livemode) {
      const a = result.account || {};
      return (
        <div className="flex items-start gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-sea flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-ink font-medium">Connected — Stripe sandbox (test mode)</p>
            <p className="text-muted-foreground mt-1 tnum">
              Account: {a.display_name || a.id} · {a.country ? a.country.toUpperCase() : "—"} · {a.default_currency ? a.default_currency.toUpperCase() : "—"}
            </p>
            <p className="text-muted-foreground tnum">
              Charges: {a.charges_enabled ? "enabled" : "disabled"} · Payouts: {a.payouts_enabled ? "enabled" : "disabled"}
            </p>
          </div>
        </div>
      );
    }

    if (result.connected && result.livemode) {
      return (
        <div className="flex items-start gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-signal flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-ink font-medium">Live key detected — not a sandbox</p>
            <p className="text-muted-foreground mt-1">
              STRIPE_SECRET_KEY is a live key. Use a test key (sk_test_…) for the sandbox.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-start gap-3 text-sm">
        <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-ink font-medium">Connection failed</p>
          <p className="text-muted-foreground mt-1">{result.error}</p>
        </div>
      </div>
    );
  };

  return (
    <section className="bg-surface border border-line p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-heading text-ink">Stripe connection</h3>
          <p className="text-sm text-muted-foreground mt-1">Verify the sandbox account is reachable.</p>
        </div>
        <button
          onClick={testConnection}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-sea text-white px-4 py-2 text-sm font-medium hover:bg-sea-deep disabled:opacity-50 min-h-[44px]"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Checking…" : "Test connection"}
        </button>
      </div>
      <div className="mt-4">{renderResult()}</div>
    </section>
  );
}