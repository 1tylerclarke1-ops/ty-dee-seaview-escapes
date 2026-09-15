import { useEffect } from "react";
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

  // Signed out → platform login, with /admin preserved as the return destination.
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      navigateToLogin();
    }
  }, [authChecked, isAuthenticated, navigateToLogin]);

  // Session still resolving, or a login redirect in flight — show nothing.
  if (isLoadingAuth || !authChecked || !isAuthenticated) {
    return <Spinner />;
  }

  // Signed in but not an admin — reveal nothing about what is behind the gate.
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink text-white px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-3xl text-white">Not authorised</h1>
          <p className="mt-3 text-white/60">You do not have access to this area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-white px-6 md:px-10 py-12 md:py-16">
      <div className="max-w-[1100px] mx-auto">
        <p className="text-sm text-white/50">Owner dashboard</p>
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