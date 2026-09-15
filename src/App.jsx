import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Caravan from '@/pages/Caravan';
import PricesAvailability from '@/pages/PricesAvailability';
import Area from '@/pages/Area';
import Dogs from '@/pages/Dogs';
import Consent from '@/pages/Consent';
import Terms from '@/pages/Terms';
import Contact from '@/pages/Contact';
import FindUs from '@/pages/FindUs';
import Admin from '@/pages/Admin';
import OfferLanding from '@/pages/OfferLanding';
import Unsubscribe from '@/pages/Unsubscribe';
import Review from '@/pages/Review';
import GuidesIndex from '@/pages/guides/GuidesIndex';
import DogFriendlyCornwall from '@/pages/guides/DogFriendlyCornwall';
import PolperroInWinter from '@/pages/guides/PolperroInWinter';
import CoastPathWalks from '@/pages/guides/CoastPathWalks';
import WhatsOpenOffSeason from '@/pages/guides/WhatsOpenOffSeason';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import OAuthConsent from '@/pages/OAuthConsent';
import WhoAmI from '@/pages/WhoAmI';

function RedirectToPrices() {
  const { search } = useLocation();
  return <Navigate to={`/prices${search}`} replace />;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth-consent" element={<OAuthConsent />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/caravan" element={<Caravan />} />
        <Route path="/prices" element={<PricesAvailability />} />
        <Route path="/area" element={<Area />} />
        <Route path="/dogs" element={<Dogs />} />
        <Route path="/consent/:token" element={<Consent />} />
        <Route path="/book" element={<RedirectToPrices />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/find-us" element={<FindUs />} />
        <Route path="/offer/:token" element={<OfferLanding />} />
        <Route path="/unsubscribe/:token" element={<Unsubscribe />} />
        <Route path="/review/:bookingId" element={<Review />} />
        <Route path="/guides" element={<GuidesIndex />} />
        <Route path="/guides/dog-friendly-cornwall" element={<DogFriendlyCornwall />} />
        <Route path="/guides/polperro-in-winter" element={<PolperroInWinter />} />
        <Route path="/guides/coast-path-walks" element={<CoastPathWalks />} />
        <Route path="/guides/whats-open-off-season" element={<WhatsOpenOffSeason />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/whoami" element={<WhoAmI />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App