import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Sparkles } from "lucide-react";
import { extractTenantFromHostname } from "@/lib/tenant-utils";

export function OnboardingComplete() {
  const { data, complete } = useOnboarding();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleComplete = async () => {
    try {
      // Get signup data from localStorage
      const signupDataStr = localStorage.getItem("signup-data");

      if (!signupDataStr) {
        // If no signup data, check if user is already authenticated (existing flow)
        if (!user?.id) {
          toast({
            title: "Missing signup information",
            description: "Please start from the signup page.",
            variant: "destructive",
          });
          navigate("/signup");
          return;
        }
      }

      let userId = user?.id;
      let isNewUser = false;
      let signupData = null;

      // Parse signup data if it exists (before we clear it)
      if (signupDataStr) {
        signupData = JSON.parse(signupDataStr);
      }

      // If we have signup data, create auth user first
      if (signupData) {
        // Get the site URL from environment variable or use current origin
        const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
        const redirectTo = `${siteUrl}/auth/callback`;

        // Extract tenant from hostname
        let tenant = extractTenantFromHostname();

        // If tenant is not 'main', verify it exists
        if (tenant !== 'main') {
          try {
            const { data: tenantOwner } = await supabase
              .from('users')
              .select('slug_name')
              .eq('slug_name', tenant)
              .maybeSingle();

            // If no tenant owner found, default to main
            if (!tenantOwner) {
              tenant = 'main';
            }
          } catch (error) {
            console.warn('Error verifying tenant, defaulting to main:', error);
            tenant = 'main';
          }
        }

        // Create auth user with email auto-confirmed
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: signupData.email,
          password: signupData.password,
          options: {
            emailRedirectTo: redirectTo,
            email_confirm: true, // This confirms email server-side if using admin key, but client-side it requires the user to click a link unless disabled in Supabase settings
            data: {
              name: signupData.name,
              contactPhone: signupData.phone,
              countryCode: signupData.countryCode,
              tenant: tenant, // Include tenant in metadata so trigger can use it

              // Onboarding data passed to the trigger
              companyName: data.companyName,
              industry: data.industry,
              teamSize: data.teamSize,
              role: data.role,
              useCase: data.useCase,
              theme: data.theme,
              notifications: data.notifications,
              goals: data.goals,
              plan: data.plan,
              stripePaymentMethodId: data.paymentMethodId,
              cardBrand: data.cardBrand,
              cardLast4: data.cardLast4,
              cardExpMonth: data.cardExpMonth,
              cardExpYear: data.cardExpYear
            }
          },
        });

        if (authError) {
          throw new Error(authError.message);
        }

        if (!authData.user) {
          throw new Error("Failed to create user account");
        }

        userId = authData.user.id;
        isNewUser = true;

        // Clear signup data from localStorage after we've used it
        localStorage.removeItem("signup-data");
      }

      if (!userId) {
        throw new Error("User ID is required");
      }

      // Client-side inserts to `users` and `payment_methods` are removed.
      // These are now handled securely by the `handle_new_auth_user` Postgres trigger
      // upon successful `supabase.auth.signUp()` because the user is not automatically
      // logged in on the client side (RLS would block it).

      // Mark onboarding as complete locally
      complete();

      // Clear onboarding state
      localStorage.removeItem("onboarding-state");

      toast({
        title: "Welcome aboard! 🎉",
        description: isNewUser
          ? "Your account has been created successfully! Redirecting to login..."
          : "Your account has been set up successfully. Let's get started!",
      });

      // Redirect to login for new users, dashboard for existing users
      if (isNewUser) {
        setTimeout(() => navigate("/login"), 1000);
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Could not complete setup",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const completedSteps = [
    { title: "Business Profile", description: `${data.companyName} in ${data.industry}` },
    { title: "Use Case", description: "Customized dashboard and terminology" },
    { title: "Preferences", description: `${data.theme} UI with notifications ${data.notifications ? 'enabled' : 'disabled'}` },
  ];

  return (
    <div className="text-center space-y-[var(--space-2xl)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
        className="space-y-[var(--space-lg)]"
      >
        <div className="flex justify-center mb-[var(--space-lg)]">
          <div className="relative">
            <CheckCircle className="h-12 w-12 text-green-500" />

            <Sparkles className="h-4 w-4 text-primary" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-[var(--space-md)]">
          You're all set!
        </h1>

        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Welcome to your personalized dashboard{(() => {
            const signupDataStr = localStorage.getItem("signup-data");
            if (signupDataStr) {
              const signupData = JSON.parse(signupDataStr);
              return `, ${signupData.name?.split(' ')[0] || 'there'}`;
            }
            return user?.fullName ? `, ${user.fullName.split(' ')[0]}` : '';
          })()}.
          We've customized everything based on your preferences and business needs.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="max-w-md mx-auto space-y-[var(--space-md)] mt-12"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-[var(--space-lg)]">
          Setup Complete
        </h3>

        {completedSteps.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
            className="flex items-center gap-[var(--space-md)] p-[var(--space-md)] bg-white/60 border-2 border-gray-100 rounded-xl"
          >
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">
                {step.title}
              </p>
              <p className="text-xs text-gray-500">
                {step.description}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="pt-[var(--space-lg)]"
      >
        <Button
          onClick={handleComplete}
          size="lg"
          className="h-14 px-12 rounded-xl bg-[#668cff] hover:bg-[#5a7ee6] shadow-lg shadow-[#668cff]/25 hover:shadow-xl hover:shadow-[#668cff]/35 transition-all duration-300 font-medium text-white text-lg"
        >
          Enter Dashboard
        </Button>
      </motion.div>
    </div>
  );
}