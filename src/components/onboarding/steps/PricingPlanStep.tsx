import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { getPlanConfigs, PLAN_CONFIGS } from "@/lib/plan-config";
import { extractTenantFromHostname } from "@/lib/tenant-utils";
import { useToast } from "@/hooks/use-toast";
import { Rocket, Buildings, Crown, Check, Sparkle } from "phosphor-react";
import { cn } from "@/lib/utils";

export function PricingPlanStep() {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const { toast } = useToast();

  const [selected, setSelected] = useState<string>(data.plan || "starter");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [plans, setPlans] = useState<Array<{
    key: string;
    name: string;
    price: number;
    features: string[];
  }>>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const tenant = extractTenantFromHostname();
        const tenantSlug = tenant === "main" ? null : tenant;
        const planConfigs = await getPlanConfigs(tenantSlug);

        const plansList = Object.values(planConfigs)
          .filter(plan => plan.key !== "free")
          .map(plan => ({
            key: plan.key,
            name: plan.name,
            price: plan.price,
            features: plan.features
          }));

        setPlans(plansList);
      } catch (error) {
        const fallback = Object.values(PLAN_CONFIGS)
          .filter(plan => plan.key !== "free")
          .map(plan => ({
            key: plan.key,
            name: plan.name,
            price: plan.price,
            features: plan.features
          }));
        setPlans(fallback);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const handleContinue = () => {
    updateData({ plan: selected });
    nextStep();
  };

  const getPlanIcon = (key: string) => {
    switch (key.toLowerCase()) {
      case "starter": return <Rocket size={24} color="#EAB308" weight="duotone" />;
      case "professional": return <Buildings size={24} color="#F43F5E" weight="duotone" />;
      case "enterprise": return <Crown size={24} color="#8B5CF6" weight="duotone" />;
      default: return <Sparkle size={24} color="#668CFF" weight="duotone" />;
    }
  };

  const getPlanSubtitle = (key: string) => {
    switch (key.toLowerCase()) {
      case "starter": return "For startups & small teams";
      case "professional": return "For growing agencies";
      case "enterprise": return "For white-label resellers";
      default: return "Custom features for you";
    }
  };

  // Helper to handle plan selection
  const handlePlanSelect = (planKey: string) => {
    setSelected(planKey);
  };

  if (loadingPlans) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-[#668cff]/20 border-t-[#668cff] rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading premium plans...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 space-y-12">
      {/* Header & Toggle */}
      <div className="flex flex-col items-center text-center space-y-8">
        <div className="space-y-3">
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight"
          >
            Choose your plan
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 text-lg"
          >
            Pick a plan now; you can change it anytime.
          </motion.p>
        </div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center p-1.5 bg-gray-100 rounded-full"
        >
          <button
            onClick={() => setBillingCycle("yearly")}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2",
              billingCycle === "yearly"
                ? "bg-[#668cff] text-white shadow-md shadow-[#668cff]/20"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Yearly
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full",
              billingCycle === "yearly" ? "bg-white/20 text-white" : "bg-[#668cff]/10 text-[#668cff]"
            )}>
              Save 20%
            </span>
          </button>
          <button
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
              billingCycle === "monthly"
                ? "bg-[#668cff] text-white shadow-md shadow-[#668cff]/20"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Monthly
          </button>
        </motion.div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, index) => {
          const isSelected = selected === plan.key;
          const isPopular = plan.key === "professional";

          // Apply 20% discount for yearly display if requested (or just show raw value)
          // Since user said "don't change values", I'll show the monthly value but add subtext
          const displayPrice = plan.price;
          const yearlyTotal = plan.price * 12 * 0.8; // Example calculation for subtext
          const perMinPrice = plan.key === "starter" ? "0.20" : plan.key === "professional" ? "0.15" : "0.10";

          return (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index + 0.3 }}
              className="relative"
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                  <span className="bg-[#668cff] text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg shadow-[#668cff]/20">
                    Most Popular
                  </span>
                </div>
              )}

              <div
                onClick={() => handlePlanSelect(plan.key)}
                className={cn(
                  "h-full p-8 rounded-[2rem] border-2 transition-all duration-500 cursor-pointer flex flex-col bg-white",
                  isSelected
                    ? "border-[#668cff] shadow-2xl shadow-[#668cff]/10 ring-4 ring-[#668cff]/5"
                    : isPopular
                      ? "border-[#668cff]/30 shadow-xl"
                      : "border-gray-100 hover:border-gray-200"
                )}
              >
                {/* Plan Header */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gray-50">
                      {getPlanIcon(plan.key)}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  </div>
                  <p className="text-gray-500 text-sm">{getPlanSubtitle(plan.key)}</p>
                </div>

                {/* Price */}
                <div className="space-y-1 mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">${displayPrice}</span>
                    <span className="text-gray-500 text-sm">/mo</span>
                  </div>
                  <div className="text-xs font-medium text-gray-400">
                    ${billingCycle === "yearly" ? Math.floor(yearlyTotal) : plan.price * 12}/yr billed annually
                  </div>
                  <div className="text-xs text-[#668cff]/70">
                    ${perMinPrice}/min usage
                  </div>
                </div>

                {/* Features */}
                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <div key={fIndex} className="flex items-start gap-3">
                      <div className="mt-0.5 p-0.5 rounded-full bg-green-50">
                        <Check size={12} color="#22C55E" weight="bold" />
                      </div>
                      <span className="text-sm text-gray-600 leading-tight">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Selection Button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlanSelect(plan.key);
                  }}
                  className={cn(
                    "w-full py-6 rounded-2xl font-semibold transition-all duration-300",
                    isPopular
                      ? "bg-[#668cff] hover:bg-[#5a7ee6] text-white shadow-lg shadow-[#668cff]/20"
                      : isSelected
                        ? "bg-[#668cff]/10 text-[#668cff] hover:bg-[#668cff]/20"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {isSelected ? "Selected" : "Select plan"}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Navigation */}
      <div className="flex gap-4 pt-8">
        <Button
          type="button"
          variant="ghost"
          onClick={prevStep}
          className="h-14 px-10 rounded-2xl text-gray-500 hover:text-gray-900 font-medium"
        >
          Back
        </Button>
        <Button
          onClick={handleContinue}
          className="h-14 flex-1 rounded-2xl bg-[#668cff] hover:bg-[#5a7ee6] text-white shadow-xl shadow-[#668cff]/20 transition-all duration-300 font-bold text-lg"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
