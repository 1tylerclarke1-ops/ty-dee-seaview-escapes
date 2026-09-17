import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageNotFound from "@/lib/PageNotFound";
import { useAuth } from "@/lib/AuthContext";
import { BUSINESS } from "@/lib/siteConfig";
import { useNoIndex } from "@/components/NoIndex";
import TodayTab from "@/components/admin/TodayTab";
import PitchFeeTracker from "@/components/admin/PitchFeeTracker";
import FacilitiesSettingsEditor from "@/components/admin/FacilitiesSettingsEditor";
import CancellationPolicyEditor from "@/components/admin/CancellationPolicyEditor";
import EmailTemplatesEditor from "@/components/admin/EmailTemplatesEditor";
import BookingsManager from "@/components/admin/BookingsManager";
import GapsView from "@/components/admin/GapsView";
import ContactsManager from "@/components/admin/ContactsManager";
import ReviewsManager from "@/components/admin/ReviewsManager";
import StripeConnectionPanel from "@/components/admin/StripeConnectionPanel";
import ConfigBanner from "@/components/admin/ConfigBanner";
import ArrivalInfoSettingsEditor from "@/components/admin/ArrivalInfoSettingsEditor";
import SendTestEmails from "@/components/admin/SendTestEmails";
import BlockedDatesManager from "@/components/admin/BlockedDatesManager";

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink">
      <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );
}

const TABS = [
  { id: "today", label: "Today" },
  { id: "bookings", label: "Bookings" },
  { id: "settings", label: "Settings" },
];

function Section({ title, children }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}

function BookingsTab() {
  return (
    <div>
      <Section title="Bookings">
        <BookingsManager />
      </Section>
      <Section title="Blocked dates">
        <BlockedDatesManager />
      </Section>
      <Section title="Gaps view · next 30 days">
        <GapsView />
      </Section>
    </div>
  );
}

function SettingsTab() {
  return (
    <div>
      <ConfigBanner />
      <Section title="Stripe connection">
        <StripeConnectionPanel />
      </Section>
      <Section title="Park facilities settings">
        <FacilitiesSettingsEditor />
      </Section>
      <Section title="Arrival info email">
        <ArrivalInfoSettingsEditor />
      </Section>
      <Section title="Cancellation policy">
        <CancellationPolicyEditor />
      </Section>
      <Section title="Email templates">
        <EmailTemplatesEditor />
      </Section>
      <Section title="Send test emails">
        <SendTestEmails />
      </Section>
      <Section title="Reviews">
        <ReviewsManager />
      </Section>
      <Section title="Guest list">
        <ContactsManager />
      </Section>
      <Section title="Pitch fee tracker">
        <PitchFeeTracker />
      </Section>
    </div>
  );
}

export default function Admin() {
  const { user, isAuthenticated, isLoadingAuth, authChecked, navigateToLogin } = useAuth();
  useNoIndex();
  const [tab, setTab] = useState("today");

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

  // Signed in but not an admin — fail closed as a plain 404, identical to any
  // unknown route. Do not confirm an admin area exists.
  if (effectiveUser?.role !== "admin") {
    return <PageNotFound />;
  }

  return (
    <div className="min-h-screen bg-ink text-white px-4 sm:px-6 md:px-10 py-10 md:py-16">
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
        <h1 className="text-3xl md:text-5xl text-white mt-2">{BUSINESS.name}</h1>

        {/* Tab nav — sticky on mobile so it stays reachable while scrolling. */}
        <nav className="sticky top-0 z-10 -mx-4 sm:-mx-6 md:-mx-10 px-4 sm:px-6 md:px-10 mt-8 mb-2 bg-ink/95 backdrop-blur border-b border-white/10">
          <div className="flex gap-1 overflow-x-auto tydee-scroll">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  tab === t.id
                    ? "text-white border-sea"
                    : "text-white/50 border-transparent hover:text-white/80"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="mt-6">
          {tab === "today" && <TodayTab />}
          {tab === "bookings" && <BookingsTab />}
          {tab === "settings" && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}