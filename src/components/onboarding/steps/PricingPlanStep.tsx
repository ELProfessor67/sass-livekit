import React from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";

const plans = [
  { key: "starter", name: "Starter", price: "$19", features: ["Up to 500 calls/month", "Basic analytics", "Email support", "2 team members", "Standard integrations"] },
  { key: "professional", name: "Professional", price: "$49", features: ["Up to 2,500 calls/month", "Advanced analytics & reporting", "Priority support", "10 team members", "All integrations", "Custom branding"] },
  { key: "enterprise", name: "Enterprise", price: "$99", features: ["Unlimited calls", "Real-time analytics", "24/7 phone support", "Unlimited team members", "Enterprise integrations", "Advanced security", "Dedicated account manager"] },
];

export function PricingPlanStep() {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [selected, setSelected] = React.useState<string>(data.plan || "starter");

  const handleContinue = () => {
    updateData({ plan: selected });
    nextStep();
  };

  return (
    <div className="space-y-[var(--space-2xl)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-[var(--space-md)]"
      >
        <h2 className="text-[var(--text-2xl)] font-[var(--font-bold)] text-theme-primary">
          Choose your plan
        </h2>
        <p className="text-[var(--text-base)] text-theme-secondary max-w-xl mx-auto">
          Start with a 7-day free trial. Pick a plan now; you can change it anytime.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="grid md:grid-cols-3 gap-[var(--space-xl)]"
      >
        {plans.map((plan) => (
          <button
            key={plan.key}
            type="button"
            onClick={() => setSelected(plan.key)}
            className={`p-[var(--space-xl)] text-left liquid-rounded-xl border transition-all duration-200 ${selected === plan.key
                ? "liquid-glass-premium border-white/20"
                : "liquid-glass-light border-white/10 hover:liquid-glass-medium"
              }`}
          >
            <div className="flex justify-between items-center mb-[var(--space-md)]">
              <h3 className="text-[var(--text-lg)] font-[var(--font-semibold)] text-theme-primary">{plan.name}</h3>
              <span className="text-[var(--text-base)] text-theme-primary/90">{plan.price}/mo</span>
            </div>
            <ul className="space-y-2 text-[var(--text-sm)] text-theme-secondary">
              {plan.features.map(f => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <div className="mt-[var(--space-md)] text-[var(--text-xs)] text-theme-secondary">
              Includes 7-day free trial
            </div>
          </button>
        ))}
      </motion.div>

      <div className="flex gap-[var(--space-md)] pt-[var(--space-lg)]">
        <Button
          type="button"
          variant="ghost"
          onClick={prevStep}
          className="liquid-glass-light hover:liquid-glass-medium"
        >
          Back
        </Button>
        <Button type="button" onClick={handleContinue} className="liquid-button flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}


