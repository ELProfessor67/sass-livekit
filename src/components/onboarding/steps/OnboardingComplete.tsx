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
import { ensureUserExists } from "@/lib/supabase-retry";

export function OnboardingComplete() {
  const { data, complete } = useOnboarding();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCompleting, setIsCompleting] = React.useState(false);

  const handleComplete = async () => {
    if (isCompleting) return;
    setIsCompleting(true);

    try {
      // Get signup data from localStorage
      const signupDataStr = localStorage.getItem("signup-data");

      if (!signupDataStr && !user?.id) {
        toast({
          title: "Missing signup information",
          description: "Please start from the signup page.",
          variant: "destructive",
        });
        navigate("/signup");
        return;
      }

      let signupData = null;
      if (signupDataStr) {
        try {
          signupData = JSON.parse(signupDataStr);
        } catch (e) {
          console.error("Failed to parse signup data", e);
        }
      }

      // If we are authenticated (via phone OTP) and have signup data
      if (user && signupData) {
        // First, ensure the user profile exists in the 'users' table
        // This addresses the "user not created" concern
        await ensureUserExists(user.id, signupData.name || data.name);

        // Validate signup data
        if (!signupData.email || !signupData.password) {
          console.error("Invalid signup data:", signupData);
          throw new Error("Account details (email/password) are missing. Please try signing up again.");
        }

        const updateDataParams: any = {
          name: signupData.name || data.name,
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
          cardExpYear: data.cardExpYear,
          onboarding_completed: true
        };

        const updateOptions: any = { data: updateDataParams };

        // Only include email/password if the email needs to be updated or added
        // This avoids redundant calls that trigger Supabase 429 rate limits
        if (user.email !== signupData.email) {
          console.log("Updating user auth with email/password (Linking account)");
          updateOptions.email = signupData.email;
          updateOptions.password = signupData.password;
        } else {
          console.log("Email already matches, updating profile metadata only");
        }

        const { error: updateError } = await supabase.auth.updateUser(updateOptions);

        if (updateError) {
          console.error("Auth update error:", updateError);
          // Handle rate limit specifically
          if (updateError.status === 429) {
            throw new Error("Supabase is rate limiting requests. Your account details were saved, but we couldn't link your email just yet. Please try clicking 'Enter Dashboard' again in 30 seconds.");
          }
          throw new Error(updateError.message);
        }

        // Clear signup data from localStorage after we've used it
        localStorage.removeItem("signup-data");
      } else if (!user) {
        toast({
          title: "Session expired",
          description: "Please restart the onboarding process.",
          variant: "destructive",
        });
        navigate("/signup");
        return;
      }

      // Mark onboarding as complete locally
      complete();

      // Clear onboarding state
      localStorage.removeItem("onboarding-state");

      toast({
        title: "Welcome aboard! 🎉",
        description: "Your account has been set up successfully. Let's get started!",
      });

      // Navigate to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Could not complete setup",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
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
              try {
                const signupData = JSON.parse(signupDataStr);
                return `, ${signupData.name?.split(' ')[0] || 'there'}`;
              } catch (e) {
                return '';
              }
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
          disabled={isCompleting}
          className="h-14 px-12 rounded-xl bg-[#668cff] hover:bg-[#5a7ee6] shadow-lg shadow-[#668cff]/25 hover:shadow-xl hover:shadow-[#668cff]/35 transition-all duration-300 font-medium text-white text-lg min-w-[200px]"
        >
          {isCompleting ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Completing...
            </span>
          ) : (
            "Enter Dashboard"
          )}
        </Button>
      </motion.div>
    </div>
  );
}