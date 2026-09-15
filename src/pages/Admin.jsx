import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { BUSINESS } from "@/lib/siteConfig";
import { useNoIndex } from "@/components/NoIndex";
import PitchFeeTracker from "@/components/admin/PitchFeeTracker";
import FacilitiesSettingsEditor from "@/components/admin/FacilitiesSettingsEditor";
import CancellationPolicyEditor from "@/components/admin/CancellationPolicyEditor";
import EmailTemplatesEditor from "@/components/admin/EmailTemplatesEditor";
import BookingsManager from "@/components/admin/BookingsManager";
import GapsView from "@/components/admin/GapsView";
import ContactsManager from "@/components/admin/ContactsManager";
import ReviewsManager from "@/components/admin/ReviewsManager";

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink">
      <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );
}

export default function Admin() {
  const { user, isAuthenticated, isLoadingAuth, authChecked, navigateToLogin } = useAuth();
  useNoIndex();

  // AuthContext only resolves a session when a bearer token is present — a
  // public app never calls me() for anonymous visitors, so a cookie-only
  // platform session (SSO) reads as signed-out and would loop into login.
  // Probe for one before redirecting, so a signed-in owner is not bounced.
  const [cookieUser, setCookieUser] = useState(null);
  const [probe, setProbe] = useState("idle"); // idle | probing | done

  useEffect(() => {
    if (!authChecked || isAuthenticated || probe !== "idle") return;
    setProbe("probing");
    base44.auth
      .me()
      .then((u) => {
        setCookieUser(u);
        setProbe("done");
      })
      .catch(() => {
        setProbe("done");
        navigateToLogin();
      });
  }, [authChecked, isAuthenticated, probe, navigateToLogin]);

  const effectiveUser = user || cookieUser;
  const isAuthed = isAuthenticated || !!cookieUser;

  if (isLoadingAuth || !authChecked || probe === "probing" || (!isAuthed && probe !== "done")) {
    return <Spinner />;
  }

  // No session at all — login redirect is in flight.
  if (!isAuthed) {
    return <Spinner />;
  }

  // Signed in but not an admin — do not strand them, but reveal nothing else.
  if (effectiveUser?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink text-white px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-3xl text-white">Not authorised</h1>
          <p className="mt-3 text-white/60">
            This account does not have admin access.
          </p>
          {effectiveUser?.email && (
            <p className="mt-2 text-sm text-white/40">
              Signed in as {effectiveUser.email}
            </p>
          )}
          <div className="mt-8 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => base44.auth.logout("/")}
              className="text-sm text-white/70 hover:text-white underline"
            >
              Sign out
            </button>
            <Link to="/" className="text-sm text-sea hover:underline">
              Back to the site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-white px-6 md:px-10 py-12 md:py-16">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-baseline justify-between gap-4 mb-2">
          <p className="text-sm text-white/50">Owner dashboard</p>
          <button
            type="button"
            onClick={() => base44.auth.logout("/")}
            className="text-xs text-white/40 hover:text-white/70"
          >
            Sign out
          </button>
        </div>
        <h1 className="text-4xl md:text-5xl text-white mt-2">{BUSINESS.name}</h1>
        <div className="border-t border-white/10 mt-8 mb-10" />
        <div className="mb-12">
          <h2 className="text-2xl text-white mb-6">Gaps view · next 30 days</h2>
          <GapsView />
        </div>
        <div className="mb-12">
          <h2 className="text-2xl text-white mb-6">Reviews</h2>
          <ReviewsManager />
        </div>
        <div className="mb-12">
          <h2 className="text-2xl text-white mb-6">Guest list</h2>
          <ContactsManager />
        </div>
        <div className="mb-12">
          <h2 className="text-2xl text-white mb-6">Park facilities settings</h2>
          <FacilitiesSettingsEditor />
        </div>
        <div className="mb-12">
          <h2 className="text-2xl text-white mb-6">Cancellation policy</h2>
          <CancellationPolicyEditor />
        </div>
        <div className="mb-12">
          <h2 className="text-2xl text-white mb-6">Email templates</h2>
          <EmailTemplatesEditor />
        </div>
        <div className="mb-12">
          <h2 className="text-2xl text-white mb-6">Bookings</h2>
          <BookingsManager />
        </div>
        <div className="mb-12">
          <h2 className="text-2xl text-white mb-6">Pitch fee tracker</h2>
          <PitchFeeTracker />
        </div>
      </div>
    </div>
  );
}