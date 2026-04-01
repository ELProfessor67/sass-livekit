import React, { useState, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { getPlanConfigs, PLAN_CONFIGS, getTenantTrialSettings, TrialSettings } from "@/lib/plan-config";
import { extractTenantFromHostname } from "@/lib/tenant-utils";
import { useToast } from "@/hooks/use-toast";
import { Rocket, Buildings, Crown, Check, ArrowRight, Globe } from "phosphor-react";

// ✏️ Replace with your actual calendar booking URL
const CALENDAR_BOOKING_URL = "https://cal.com/waverunner/enterprise";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function PricingPlanStep() {
  const { data, updateData, nextStep, prevStep, goToStep } = useOnboarding();
  const { toast } = useToast();

  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("yearly");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(data.plan || "");
  const [plans, setPlans] = useState<Array<{
    key: string;
    name: string;
    price: number;
    features: string[];
  }>>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [trialSettings, setTrialSettings] = useState<TrialSettings | null>(null);

  useEffect(() => {
    const fetchPlansAndTrial = async () => {
      try {
        setLoadingPlans(true);
        const tenant = extractTenantFromHostname();
        const tenantSlug = tenant === "main" ? null : tenant;

        const [planConfigs, trial] = await Promise.all([
          getPlanConfigs(tenantSlug),
          getTenantTrialSettings(tenantSlug),
        ]);

        // Cards: non-free, non-enterprise plans
        const plansList = Object.values(planConfigs)
          .filter(plan => plan.key !== "free" && plan.key !== "enterprise")
          .map(plan => ({
            key: plan.key,
            name: plan.name,
            price: plan.price,
            features: plan.features,
          }));

        setPlans(plansList);
        setTrialSettings(trial);

        // Default select first paid plan if nothing selected
        if (!data.plan && plansList.length > 0) {
          setSelectedPlanId(plansList[1]?.key || plansList[0].key);
        }
      } catch (error) {
        const fallback = Object.values(PLAN_CONFIGS)
          .filter(plan => plan.key !== "free" && plan.key !== "enterprise")
          .map(plan => ({
            key: plan.key,
            name: plan.name,
            price: plan.price,
            features: plan.features,
          }));
        setPlans(fallback);
        if (!data.plan && fallback.length > 0) {
          setSelectedPlanId(fallback[1]?.key || fallback[0].key);
        }
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlansAndTrial();
  }, []);

  const getPlanIcon = (key: string) => {
    switch (key.toLowerCase()) {
      case "starter": return { Icon: Rocket, className: "text-amber-400/70" };
      case "professional": return { Icon: Buildings, className: "text-rose-400/70" };
      default: return { Icon: Crown, className: "text-violet-400/70" };
    }
  };

  const isPopular = (key: string) => key === "professional";

  const confirmPlan = (planKey: string) => {
    updateData({ plan: planKey, isTrial: false });
    nextStep();
  };

  const handleContinueWithFree = () => {
    if (!trialSettings?.free_trial_enabled) return;
    updateData({ plan: "starter", isTrial: true });
    toast({
      title: "Free trial activated",
      description: `You've started your ${trialSettings.free_trial_days}-day free trial with ${trialSettings.free_trial_minutes} minutes!`,
    });
    goToStep(9);
  };

  const handleScheduleCall = () => {
    window.open(CALENDAR_BOOKING_URL, "_blank", "noopener,noreferrer");
  };

  if (loadingPlans) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-[#668cff]/20 border-t-[#668cff] rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading plans...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="text-center mb-8"
      >
        <motion.h1
          variants={itemVariants}
          className="text-3xl md:text-4xl font-light text-gray-900 mb-3"
        >
          Choose your plan
        </motion.h1>
        <motion.p variants={itemVariants} className="text-gray-500 text-lg">
          Start with a 7-day free trial. Cancel anytime.
        </motion.p>
      </motion.div>

      {/* Billing Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center mb-8"
      >
        <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setBillingInterval("yearly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${billingInterval === "yearly"
                ? "bg-[#668cff] text-white shadow-md"
                : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Yearly{" "}
            <span className={`ml-1 text-xs ${billingInterval === "yearly" ? "text-white/80" : "text-green-500"}`}>
              Save 20%
            </span>
          </button>
          <button
            onClick={() => setBillingInterval("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${billingInterval === "monthly"
                ? "bg-[#668cff] text-white shadow-md"
                : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Monthly
          </button>
        </div>
      </motion.div>

      {/* Plan Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6"
      >
        {plans.map((plan) => {
          const yearlyPrice = Math.floor(plan.price * 0.8);
          const price = billingInterval === "yearly" ? yearlyPrice : plan.price;
          const popular = isPopular(plan.key);
          const isSelected = selectedPlanId === plan.key;
          const { Icon, className: iconClass } = getPlanIcon(plan.key);
          const perMinPrice = plan.key === "starter" ? "$0.20" : plan.key === "professional" ? "$0.15" : "$0.10";

          return (
            <div
              key={plan.key}
              onClick={() => setSelectedPlanId(plan.key)}
              className={`relative bg-white rounded-2xl border p-6 flex flex-col transition-all duration-200 cursor-pointer ${isSelected
                  ? "border-[#668cff] ring-2 ring-[#668cff]/30 shadow-lg scale-[1.02]"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                }`}
            >
              {popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#668cff] text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-5">
                <div className="flex items-center gap-2 mb-0.5">
                  <Icon size={20} weight="duotone" className={iconClass} />
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  {plan.key === "starter"
                    ? "For startups & small teams"
                    : plan.key === "professional"
                      ? "For growing agencies"
                      : "Custom features for you"}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">${price}</span>
                  <span className="text-gray-500 text-sm">/mo</span>
                </div>
                {billingInterval === "yearly" && (
                  <p className="text-xs text-gray-400 mt-0.5">${price * 12}/yr billed annually</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{perMinPrice}/min usage</p>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={16} weight="bold" className="text-green-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={(e) => { e.stopPropagation(); confirmPlan(plan.key); }}
                className={`w-full h-11 rounded-xl text-sm font-medium transition-all duration-300 ${isSelected
                    ? "bg-[#668cff] text-white shadow-lg shadow-[#668cff]/25 hover:shadow-xl hover:shadow-[#668cff]/35 hover:bg-[#5a7ee6]"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Select plan
              </button>
            </div>
          );
        })}
      </motion.div>

      {/* Enterprise Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-3">
          <Globe size={20} weight="duotone" className="text-sky-400/70" />
          <div>
            <h3 className="text-base font-semibold text-gray-900">Enterprise</h3>
            <p className="text-sm text-gray-500">Custom pricing for large organizations</p>
          </div>
        </div>
        <button
          onClick={handleScheduleCall}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
        >
          Schedule a call
          <ArrowRight size={14} />
        </button>
      </motion.div>

      {/* Continue with Free + Go back */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center space-y-3"
      >
        {trialSettings?.free_trial_enabled && (
          <button
            onClick={handleContinueWithFree}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors underline-offset-2 hover:underline"
          >
            Continue with Free
          </button>
        )}
        <div>
          <button
            onClick={prevStep}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Go back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
