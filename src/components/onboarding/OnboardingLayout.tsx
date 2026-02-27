import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { WelcomeScreen } from "./steps/WelcomeScreen";
import { NameStep } from "./steps/NameStep";
import { PersonalizedGreeting } from "./steps/PersonalizedGreeting";
import { BusinessProfileStep } from "./steps/BusinessProfileStep";
import { UseCaseSelectionStep } from "./steps/UseCaseSelectionStep";
import { PreferencesStep } from "./steps/PreferencesStep";
import { PricingPlanStep } from "./steps/PricingPlanStep";
import { PaymentStep } from "./steps/PaymentStep";
import { OnboardingComplete } from "./steps/OnboardingComplete";
import { ProgressRing } from "./ProgressRing";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const steps = [
  { component: WelcomeScreen, title: "Welcome" },
  { component: NameStep, title: "Name" },
  { component: PersonalizedGreeting, title: "Greeting" },
  { component: UseCaseSelectionStep, title: "Use Case" },
  { component: BusinessProfileStep, title: "Business Profile" },
  { component: PreferencesStep, title: "Preferences" },
  { component: PricingPlanStep, title: "Pricing" },
  { component: PaymentStep, title: "Payment" },
  { component: OnboardingComplete, title: "Complete" }
];

export function OnboardingLayout() {
  const { currentStep, totalSteps, getProgress, prevStep, isCompleted } = useOnboarding();
  const { user, loading: isLoading } = useAuth();
  const isAuthenticated = !!user;
  const profile = user;
  const isProfileLoading = isLoading;
  const navigate = useNavigate();

  // Check if user has signup data (new flow) or is authenticated (existing flow)
  React.useEffect(() => {
    if (isLoading || isProfileLoading) return;

    // Check for signup data in localStorage (new flow - onboarding before auth)
    const signupData = localStorage.getItem("signup-data");

    // If no signup data and not authenticated, redirect to signup
    if (!signupData && !isAuthenticated) {
      navigate("/signup");
      return;
    }

    // If authenticated and already completed onboarding, redirect to dashboard
    if (isAuthenticated) {
      // @ts-expect-error - profile type might not have onboarding_completed explicitly defined in all contexts
      const dbCompleted = Boolean(profile?.onboarding_completed);
      if (dbCompleted || isCompleted) {
        navigate("/dashboard");
      }
    }
    // @ts-expect-error - profile type might not have onboarding_completed explicitly defined in all contexts
  }, [isAuthenticated, isLoading, isProfileLoading, navigate, isCompleted, profile?.onboarding_completed]);

  const CurrentStepComponent = steps[currentStep]?.component;
  const progress = getProgress();

  if (!CurrentStepComponent) return null;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-6xl">
        {/* Progress Ring - only show after welcome screen */}
        {currentStep > 0 && (
          <div className="mb-8">
            <ProgressRing currentStep={currentStep} totalSteps={totalSteps} />
          </div>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full"
          >
            <CurrentStepComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}