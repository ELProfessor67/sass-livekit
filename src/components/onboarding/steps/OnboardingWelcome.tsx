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
  const { nextStep } = useOnboarding();
  const { user } = useAuth();

  return (
    <div className="text-center space-y-[var(--space-2xl)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="space-y-[var(--space-lg)]"
      >
        <div className="flex justify-center mb-[var(--space-lg)]">
          <div className="p-[var(--space-lg)] liquid-glass-premium liquid-rounded-full">
            <Sparkles className="h-12 w-12 text-primary" />
          </div>
        </div>

        <h1 className="text-[var(--text-3xl)] font-[var(--font-bold)] text-theme-primary">
          Welcome to the Platform, {user?.fullName?.split(' ')[0] || 'there'}!
        </h1>
        
        <p className="text-[var(--text-lg)] text-theme-secondary max-w-2xl mx-auto leading-relaxed">
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
              className="p-[var(--space-xl)] liquid-glass-light hover:liquid-glass-medium transition-all duration-300 liquid-rounded-xl border border-white/5"
            >
              <IconComponent className="h-8 w-8 text-primary mx-auto mb-[var(--space-md)]" />
              <h3 className="text-[var(--text-base)] font-[var(--font-semibold)] text-theme-primary mb-[var(--space-sm)]">
                {feature.title}
              </h3>
              <p className="text-[var(--text-sm)] text-theme-secondary leading-relaxed">
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