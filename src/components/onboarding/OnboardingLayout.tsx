import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { OnboardingWelcome } from "./steps/OnboardingWelcome";
import { BusinessProfileStep } from "./steps/BusinessProfileStep";
import { UseCaseSelectionStep } from "./steps/UseCaseSelectionStep";
import { PreferencesStep } from "./steps/PreferencesStep";
import { OnboardingComplete } from "./steps/OnboardingComplete";
import { PricingPlanStep } from "./steps/PricingPlanStep";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const steps = [
  { component: OnboardingWelcome, title: "Welcome" },
  { component: BusinessProfileStep, title: "Business Profile" },
  { component: UseCaseSelectionStep, title: "Use Case" },
  { component: PreferencesStep, title: "Preferences" },
  { component: PricingPlanStep, title: "Pricing" },
  { component: OnboardingComplete, title: "Complete" }
];

export function OnboardingLayout() {
  const { currentStep, totalSteps, getProgress, prevStep, isCompleted } = useOnboarding();
  const { isAuthenticated, isLoading } = useAuth();
  const { profile, isLoading: isProfileLoading } = useUserProfile();
  const navigate = useNavigate();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (isLoading || isProfileLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, isProfileLoading, navigate]);

  // Redirect if already completed
  React.useEffect(() => {
    if (isProfileLoading) return;
    const dbCompleted = Boolean(profile?.onboarding_completed);
    if (dbCompleted || isCompleted) {
      navigate("/");
    }
  }, [isCompleted, profile?.onboarding_completed, isProfileLoading, navigate]);

  const CurrentStepComponent = steps[currentStep]?.component;
  const progress = getProgress();

  if (!CurrentStepComponent) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-[var(--space-md)]">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-[var(--space-xl)]">
          <div className="flex items-center justify-between mb-[var(--space-sm)]">
            <div className="flex items-center gap-[var(--space-md)]">
              {currentStep > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevStep}
                  className="liquid-glass-light hover:liquid-glass-medium transition-all duration-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <h2 className="text-[var(--text-lg)] font-[var(--font-semibold)] text-theme-primary">
                {steps[currentStep]?.title}
              </h2>
            </div>
            <span className="text-[var(--text-sm)] text-theme-secondary font-[var(--font-medium)]">
              {currentStep + 1} of {totalSteps}
            </span>
          </div>
          <Progress 
            value={progress} 
            className="h-2 liquid-glass-light [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary/80"
          />
        </div>

        {/* Step Content */}
        <div className="liquid-glass-medium liquid-rounded-2xl backdrop-blur-xl border border-white/10 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="p-[var(--space-2xl)]"
            >
              <CurrentStepComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}