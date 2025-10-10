
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { BusinessUseCaseProvider } from "./components/BusinessUseCaseProvider";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
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

function AnimatedRoutes() {
  function ProtectedAuthPage({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    
    // If user is authenticated, redirect to dashboard
    if (user && !loading) {
      return <Navigate to="/dashboard" replace />;
    }
    
    // If still loading, show loading state
    if (loading) {
      return <div>Loading...</div>;
    }
    
    // If not authenticated, show the auth page
    return <>{children}</>;
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
            
            const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
            
            if (error) {
              console.error("Error checking onboarding status:", error);
              // If we can't check the database, assume onboarding is completed for existing users
              setOnboardingStatus(true);
            } else {
              setOnboardingStatus(data?.onboarding_completed || false);
            }
          } catch (error) {
            console.error("Error checking onboarding status:", error);
            // If there's any error (including timeout), assume onboarding is completed
            setOnboardingStatus(true);
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
    const shouldRedirectToOnboarding = user && !localCompleted && !onboardingStatus;

    if (shouldRedirectToOnboarding && location.pathname !== "/onboarding") {
      return <Navigate to="/onboarding" replace />;
    }

    // If user is authenticated and on landing page, redirect to dashboard
    if (user && location.pathname === "/") {
      return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
  }

  return (
    <Routes>
      <Route path="/signup" element={<ProtectedAuthPage><SignUp /></ProtectedAuthPage>} />
      <Route path="/login" element={<ProtectedAuthPage><Login /></ProtectedAuthPage>} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<RequireOnboarding />}>
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
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/billing" element={<Billing />} />
      </Route>
      {/* Landing page for unauthenticated users */}
      <Route path="/" element={<LandingPage />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
        <BusinessUseCaseProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AnimatedRoutes />
            </TooltipProvider>
          </QueryClientProvider>
        </BusinessUseCaseProvider>
      </AuthProvider>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
