import React from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { Button } from "@/components/ui/button";
import { Sparkles, BarChart3, Users, Zap } from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track your call performance and key metrics"
  },
  {
    icon: Users,
    title: "Smart Call Management",
    description: "Organize and analyze all your conversations"
  },
  {
    icon: Zap,
    title: "AI-Powered Insights",
    description: "Get actionable insights from every interaction"
  }
];

export function OnboardingWelcome() {
  const { nextStep, data } = useOnboarding();
  const { user } = useAuth();

  // Use the name from onboarding data (collected in NameStep) or fallback to user metadata
  const displayName = data.name || user?.fullName || 'there';
  const firstName = displayName.split(' ')[0];

  return (
    <div className="text-center space-y-[var(--space-2xl)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="space-y-[var(--space-lg)]"
      >
        <div className="flex justify-center mb-[var(--space-lg)]">
          <Sparkles className="h-12 w-12 text-primary" />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
          Welcome to the Platform, {firstName}!
        </h1>

        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Let's get you set up with a personalized experience. We'll customize your dashboard,
          terminology, and features based on your business needs.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid md:grid-cols-3 gap-[var(--space-xl)] max-w-3xl mx-auto"
      >
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <div
              key={feature.title}
              className="p-[var(--space-xl)] bg-[#668cff]/10 hover:bg-[#668cff]/15 transition-all duration-300 rounded-xl border border-[#668cff]/20"
            >
              <IconComponent className="h-8 w-8 text-primary mx-auto mb-[var(--space-md)]" />
              <h3 className="text-lg font-semibold text-gray-900 mb-[var(--space-sm)]">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="pt-[var(--space-lg)]"
      >
        <Button
          onClick={nextStep}
          size="lg"
          className="liquid-button px-[var(--space-2xl)] py-[var(--space-lg)] text-[var(--text-base)] font-[var(--font-medium)]"
        >
          Get Started
        </Button>
      </motion.div>
    </div>
  );
}