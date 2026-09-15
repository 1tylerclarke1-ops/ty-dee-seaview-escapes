import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { useAuth } from "@/lib/AuthContext";
import { useNoIndex } from "@/components/NoIndex";

// Temporary diagnostic: shows the raw auth state so the owner can see why
// /admin is refusing access — without requiring the admin role. Signed-out
// visitors are redirected to login (same gate as /admin); signed-in users
// of any role see their own state. Remove once access is confirmed.
function Row({ label, value }) {
  return (
    <div className="flex gap-4 border-b border-white/10 py-2">
      <dt className="text-white/50 w-56 shrink-0">{label}</dt>
      <dd className="text-white font-mono break-all">{value}</dd>
    </div>
  );
}

export default function WhoAmI() {
  useNoIndex();
  const { user, isAuthenticated, isLoadingAuth, authChecked, navigateToLogin } = useAuth();
  const [probedUser, setProbedUser] = useState(null);
  const [probeError, setProbeError] = useState(null);
  const [probing, setProbing] = useState(true);

  // Probe me() directly so a cookie-only platform session is visible even
  // when AuthContext (bearer-token path) reads as signed-out.
  useEffect(() => {
    base44
      .auth
      .me()
      .then((u) => setProbedUser(u))
      .catch((e) => setProbeError(e?.status ? String(e.status) : e?.message || "no session"))
      .finally(() => setProbing(false));
  }, []);

  const effectiveUser = user || probedUser;
  const isAuthed = isAuthenticated || !!probedUser;

  useEffect(() => {
    if (!probing && !isAuthed) navigateToLogin();
  }, [probing, isAuthed, navigateToLogin]);

  if (probing || isLoadingAuth || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const params = new URLSearchParams(window.location.search);

  return (
    <div className="min-h-screen bg-ink text-white px-6 md:px-10 py-12">
      <div className="max-w-2xl mx-auto">
        <p className="text-sm text-white/50">Diagnostic · temporary</p>
        <h1 className="text-3xl text-white mt-2">Who am I?</h1>
        <div className="border-t border-white/10 mt-6 mb-4" />
        <dl className="text-sm">
          <Row label="Bearer token present" value={appParams.token ? "yes" : "no"} />
          <Row label="AuthContext isAuthenticated" value={isAuthenticated ? "yes" : "no"} />
          <Row label="AuthContext authChecked" value={authChecked ? "yes" : "no"} />
          <Row
            label="me() resolved"
            value={probedUser ? "yes" : probeError ? `no (${probeError})` : "pending"}
          />
          <Row label="User id" value={effectiveUser?.id || "—"} />
          <Row label="Email" value={effectiveUser?.email || "—"} />
          <Row label="Full name" value={effectiveUser?.full_name || "—"} />
          <Row label="Role" value={effectiveUser?.role || "— (none returned)"} />
          <Row label="from_url param" value={params.get("from_url") || "—"} />
          <Row label="returnTo param" value={params.get("returnTo") || "—"} />
        </dl>
        <div className="mt-8 flex items-center gap-6">
          <Link to="/" className="text-sm text-sea hover:underline">
            Back to the site
          </Link>
          <button
            type="button"
            onClick={() => base44.auth.logout("/")}
            className="text-sm text-white/60 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}