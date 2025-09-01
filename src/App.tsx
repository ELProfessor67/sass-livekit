
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { BusinessUseCaseProvider } from "./components/BusinessUseCaseProvider";
import { useAuth } from "./hooks/useAuth";
import { useUserProfile } from "./hooks/useUserProfile";
import Index from "./pages/Index";
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

// Create a client with better error handling and retry limits
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Only retry once
      retryDelay: 500, // Wait half a second before retry
      staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
      refetchOnWindowFocus: false, // Don't refetch when window gets focus
      refetchOnReconnect: false, // Don't refetch when reconnecting
    }
  }
});

function AnimatedRoutes() {
  function RequireOnboarding() {
    const location = useLocation();
    const { isAuthenticated, isLoading } = useAuth();
    const { profile, isLoading: isProfileLoading } = useUserProfile();

    if (isLoading || isProfileLoading) return null;

    const dbCompleted = Boolean(profile?.onboarding_completed);
    const localCompleted = localStorage.getItem("onboarding-completed") === "true";
    const shouldRedirectToOnboarding = isAuthenticated && !(dbCompleted || localCompleted);

    if (shouldRedirectToOnboarding && location.pathname !== "/onboarding") {
      return <Navigate to="/onboarding" replace />;
    }

    return <Outlet />;
  }

  return (
    <Routes>
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<RequireOnboarding />}>
        <Route path="/" element={<Index />} />
        <Route path="/assistants" element={<Assistants />} />
        <Route path="/assistants/create" element={<CreateAssistant />} />
        <Route path="/assistants/edit/:id" element={<CreateAssistant />} />
        <Route path="/assistants/knowledge-base/:id/edit" element={<KnowledgeBaseEditor />} />
        <Route path="/calls" element={<Calls />} />
        <Route path="/calls/:id" element={<CallDetails />} />
        <Route path="/voiceagent" element={<VoiceAgent />} />
        <Route path="/conversations" element={<Conversations />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/billing" element={<Billing />} />
      </Route>
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider defaultTheme="dark">
    <BusinessUseCaseProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </BusinessUseCaseProvider>
  </ThemeProvider>
);

export default App;
