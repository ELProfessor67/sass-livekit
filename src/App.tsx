
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { BusinessUseCaseProvider } from "./components/BusinessUseCaseProvider";
import { AuthProvider, useAuth } from "./contexts/SupportAccessAuthContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { useAccountMinutes } from "./hooks/useAccountMinutes";
import { WebsiteSettingsProvider } from "./contexts/WebsiteSettingsContext";
import { supabase } from "./integrations/supabase/client";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import Assistants from "./pages/Assistants";
import CreateAssistant from "./pages/CreateAssistant";
import KnowledgeBaseEditor from "./pages/KnowledgeBaseEditor";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Integrations from "./pages/Integrations";
import Billing from "./pages/Billing";
import NotFound from "./pages/NotFound";
import Calls from "./pages/Calls";
import CallDetails from "./pages/CallDetails";
import Conversations from "./pages/Conversations";
import Contacts from "./pages/Contacts";
import Campaigns from "./pages/Campaigns";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import VoiceAgent from "./pages/VoiceAgent";
import AdminPanel from "./pages/AdminPanel";
import AuthCallback from "./pages/AuthCallback";
import Composer from "./pages/Composer";
import ComposerBuilder from "./pages/ComposerBuilder";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import { AcceptInvitation } from "./pages/AcceptInvitation";
import PaymentCallback from "./pages/PaymentCallback";


// Create a client with better error handling and retry limits
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Only retry once
      retryDelay: 500, // Wait half a second before retry
      staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
      refetchOnWindowFocus: false, // Disable aggressive refetching on window focus
      refetchOnReconnect: true, // Refetch when reconnecting
      refetchOnMount: true, // Always refetch on component mount
    }
  }
});

function ProtectedAuthPage({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // If user is authenticated, redirect to dashboard or returnTo
  if (user && !loading) {
    const savedReturnTo = sessionStorage.getItem("returnTo");
    if (savedReturnTo) {
      console.log('ProtectedAuthPage: Redirecting to saved returnTo:', savedReturnTo);
      sessionStorage.removeItem("returnTo");
      return <Navigate to={savedReturnTo} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // If still loading, show loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  // If not authenticated, show the auth page
  return <>{children}</>;
}

// Routes that remain accessible even when trial is expired
const TRIAL_ALLOWED_PATHS = ["/billing", "/settings", "/profile", "/admin"];

function TrialExpiredGuard() {
  const location = useLocation();
  const { user } = useAuth();
  const { remainingMinutes, isLoading: minutesLoading } = useAccountMinutes();

  // Admins and non-trial users always pass
  if (!user || user.role === 'admin') return <Outlet />;

  const trialEndsAt = user.trialEndsAt;
  if (!trialEndsAt) return <Outlet />;

  // Don't block while minutes are still loading (avoid false redirect flash)
  if (minutesLoading) return <Outlet />;

  const isDateExpired = new Date(trialEndsAt) <= new Date();
  const isMinutesExhausted = remainingMinutes <= 0;

  // Block when either the trial period has ended OR the trial minutes ran out
  const isBlocked = isDateExpired || isMinutesExhausted;
  if (!isBlocked) return <Outlet />;

  // Allow access to billing and settings so user can upgrade
  const isAllowed = TRIAL_ALLOWED_PATHS.some(p => location.pathname.startsWith(p));
  if (isAllowed) return <Outlet />;

  return <Navigate to="/billing?trial_expired=true" replace />;
}

function RequireOnboarding() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [onboardingStatus, setOnboardingStatus] = useState<boolean | null>(null);

  // Check onboarding status from database with timeout
  useEffect(() => {
    if (user?.id && !loading) {
      const checkOnboardingStatus = async () => {
        try {
          // Set a timeout for the database query
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Database timeout')), 3000)
          );

          const queryPromise = supabase
            .from("users")
            .select("onboarding_completed")
            .eq("id", user.id)
            .single();

          const { data, error } = (await Promise.race([queryPromise, timeoutPromise])) as any;

          if (error) {
            console.error("Error checking onboarding status:", error);
            // If we can't check the database, default to false (require onboarding) to be safe for new users
            setOnboardingStatus(false);
          } else {
            setOnboardingStatus(data?.onboarding_completed || false);
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
          // If there's any error (including timeout), default to false to be safe
          setOnboardingStatus(false);
        }
      };

      checkOnboardingStatus();
    }
  }, [user?.id, loading]);

  if (loading || onboardingStatus === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const localCompleted = localStorage.getItem("onboarding-completed") === "true";
  const signupData = localStorage.getItem("signup-data");

  // If user has signup data but hasn't completed onboarding, redirect to onboarding
  if (signupData && !localCompleted && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // For authenticated users, check onboarding status
  const shouldRedirectToOnboarding = user && !localCompleted && !onboardingStatus;

  if (shouldRedirectToOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // If user is authenticated and on landing page, redirect to dashboard or returnTo
  if (user && location.pathname === "/") {
    const savedReturnTo = sessionStorage.getItem("returnTo");
    if (savedReturnTo) {
      console.log('RequireOnboarding: Redirecting to saved returnTo:', savedReturnTo);
      sessionStorage.removeItem("returnTo");
      return <Navigate to={savedReturnTo} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Require authentication for protected routes (onboarding route is separate, not protected)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function AnimatedRoutes() {
  return (
    <Routes>
      <Route path="/signup" element={<ProtectedAuthPage><SignUp /></ProtectedAuthPage>} />
      <Route path="/login" element={<ProtectedAuthPage><Login /></ProtectedAuthPage>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<RequireOnboarding />}>
        <Route element={<TrialExpiredGuard />}>
          <Route path="/dashboard" element={<Index />} />
          <Route path="/assistants" element={<Assistants />} />
          <Route path="/assistants/create" element={<CreateAssistant />} />
          <Route path="/assistants/edit/:id" element={<CreateAssistant />} />
          <Route path="/assistants/knowledge-base/:id/edit" element={<KnowledgeBaseEditor />} />
          <Route path="/calls" element={<Calls />} />
          <Route path="/calls/:id" element={<CallDetails />} />
          <Route path="/voiceagent" element={<VoiceAgent />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/workflows" element={<Composer />} />
          <Route path="/workflows/:id" element={<ComposerBuilder />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/billing" element={<Billing />} />
        </Route>
      </Route>
      {/* Landing page for unauthenticated users */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/accept-invitation" element={<AcceptInvitation />} />
      <Route path="/payment-callback" element={<PaymentCallback />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider defaultTheme="dark">
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <WorkspaceProvider>
          <WebsiteSettingsProvider>
            <BusinessUseCaseProvider>
              <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <AnimatedRoutes />
                </TooltipProvider>
              </QueryClientProvider>
            </BusinessUseCaseProvider>
          </WebsiteSettingsProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
