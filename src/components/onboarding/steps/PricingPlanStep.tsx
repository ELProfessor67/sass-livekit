// import React from "react";
// import { motion } from "framer-motion";
// import { useOnboarding } from "@/hooks/useOnboarding";
// import { Button } from "@/components/ui/button";
// import { getPlanConfigs, PLAN_CONFIGS } from "@/lib/plan-config";
// import { extractTenantFromHostname } from "@/lib/tenant-utils";
// import { supabase } from "@/integrations/supabase/client";
// import { useToast } from "@/hooks/use-toast";

// export function PricingPlanStep() {
//   const { data, updateData, nextStep, prevStep } = useOnboarding();
//   const { toast } = useToast();
//   const [selected, setSelected] = React.useState<string>(data.plan || "starter");
//   const [plans, setPlans] = React.useState<Array<{
//     key: string;
//     name: string;
//     price: string;
//     features: string[];
//     minutesLimit: number;
//   }>>([]);
//   const [loadingPlans, setLoadingPlans] = React.useState(true);
//   const [availableMinutes, setAvailableMinutes] = React.useState<number | null>(null);
//   const [adminMinutes, setAdminMinutes] = React.useState<number | null>(null);

//   // Fetch plans from database based on tenant and check available minutes
//   React.useEffect(() => {
//     const fetchPlans = async () => {
//       try {
//         setLoadingPlans(true);
//         const tenant = extractTenantFromHostname();
//         const tenantSlug = tenant === 'main' ? null : tenant;
//         console.log(`[PricingPlanStep] Detected tenant from URL: ${tenant}, Using slug: ${tenantSlug || 'null (main)'}`);
//         const planConfigs = await getPlanConfigs(tenantSlug);
//         console.log(`[PricingPlanStep] Received plans:`, Object.keys(planConfigs).map(key => `${key}: $${planConfigs[key].price}`));

//         // Check available minutes for white label tenants
//         if (tenantSlug) {
//           // Get tenant admin's minutes
//           const { data: adminData } = await supabase
//             .from('users')
//             .select('minutes_limit')
//             .eq('slug_name', tenantSlug)
//             .eq('role', 'admin')
//             .single();

//           if (adminData) {
//             const adminMinutesLimit = adminData.minutes_limit || 0;
//             setAdminMinutes(adminMinutesLimit);

//             // If admin has unlimited (0), set available to null (no limit)
//             if (adminMinutesLimit === 0) {
//               setAvailableMinutes(null);
//             } else {
//               // Calculate total minutes already allocated to customers
//               const { data: customers } = await supabase
//                 .from('users')
//                 .select('minutes_limit')
//                 .eq('tenant', tenantSlug)
//                 .neq('role', 'admin'); // Exclude admin

//               const allocatedMinutes = (customers || []).reduce((sum, customer) => {
//                 const customerMinutes = customer.minutes_limit || 0;
//                 // Only count limited plans (exclude unlimited/0)
//                 return customerMinutes > 0 ? sum + customerMinutes : sum;
//               }, 0);

//               const available = adminMinutesLimit - allocatedMinutes;
//               setAvailableMinutes(Math.max(0, available));
//             }
//           }
//         } else {
//           // Main tenant - no limit
//           setAvailableMinutes(null);
//           setAdminMinutes(null);
//         }

//         // Filter out free plan and convert to array format for display
//         const plansList = Object.values(planConfigs)
//           .filter(plan => plan.key !== 'free')
//           .map(plan => ({
//             key: plan.key,
//             name: plan.name,
//             price: `$${plan.price}`,
//             features: plan.features,
//             minutesLimit: plan.minutesLimit
//           }));

//         setPlans(plansList);
//       } catch (error) {
//         console.error('Error fetching plans:', error);
//         // Fallback to default plans
//         const defaultPlans = Object.values(PLAN_CONFIGS)
//           .filter(plan => plan.key !== 'free')
//           .map(plan => ({
//             key: plan.key,
//             name: plan.name,
//             price: `$${plan.price}`,
//             features: plan.features,
//             minutesLimit: plan.minutesLimit
//           }));
//         setPlans(defaultPlans);
//         setAvailableMinutes(null);
//         setAdminMinutes(null);
//       } finally {
//         setLoadingPlans(false);
//       }
//     };

//     fetchPlans();
//   }, []);

//   const handleContinue = () => {
//     // Validate if selected plan is available
//     const selectedPlan = plans.find(p => p.key === selected);
//     if (selectedPlan && availableMinutes !== null && adminMinutes !== null && adminMinutes > 0) {
//       const planMinutes = selectedPlan.minutesLimit || 0;

//       // Check if plan requires unlimited (0) - not allowed for limited admin
//       if (planMinutes === 0) {
//         toast({
//           title: "Plan not available",
//           description: "This unlimited plan is not available. Please select a plan with limited minutes.",
//           variant: "destructive",
//         });
//         return;
//       }

//       // Check if admin has enough available minutes
//       if (planMinutes > availableMinutes) {
//         toast({
//           title: "Insufficient minutes available",
//           description: `This plan requires ${planMinutes.toLocaleString()} minutes, but only ${availableMinutes.toLocaleString()} minutes are available. Please contact your administrator to request more minutes or select a different plan.`,
//           variant: "destructive",
//         });
//         return;
//       }
//     }

//     updateData({ plan: selected });
//     nextStep();
//   };

//   if (loadingPlans) {
//     return (
//       <div className="space-y-[var(--space-2xl)]">
//         <div className="text-center">
//           <h2 className="text-[var(--text-2xl)] font-[var(--font-bold)] text-theme-primary">
//             Choose your plan
//           </h2>
//           <p className="text-[var(--text-base)] text-theme-secondary max-w-xl mx-auto mt-4">
//             Loading plans...
//           </p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-[var(--space-2xl)]">
//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.6 }}
//         className="text-center space-y-[var(--space-md)]"
//       >
//         <h2 className="text-[var(--text-2xl)] font-[var(--font-bold)] text-theme-primary">
//           Choose your plan
//         </h2>
//         <p className="text-[var(--text-base)] text-theme-secondary max-w-xl mx-auto">
//           Start with a 7-day free trial. Pick a plan now; you can change it anytime.
//         </p>
//       </motion.div>

//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.6, delay: 0.1 }}
//         className="grid md:grid-cols-3 gap-[var(--space-xl)]"
//       >
//         {plans.map((plan) => {
//           const planMinutes = plan.minutesLimit || 0;
//           const isUnlimited = planMinutes === 0;
//           const isAvailable = availableMinutes === null || 
//             (adminMinutes !== null && adminMinutes > 0 && !isUnlimited && planMinutes <= availableMinutes) ||
//             (adminMinutes !== null && adminMinutes === 0); // Admin has unlimited
//           const isDisabled = availableMinutes !== null && adminMinutes !== null && adminMinutes > 0 && 
//             (isUnlimited || planMinutes > availableMinutes);

//           return (
//             <button
//               key={plan.key}
//               type="button"
//               onClick={() => {
//                 if (isDisabled) {
//                   if (isUnlimited) {
//                     toast({
//                       title: "Plan not available",
//                       description: "Unlimited plans are not available. Please select a plan with limited minutes.",
//                       variant: "destructive",
//                     });
//                   } else {
//                     toast({
//                       title: "Insufficient minutes",
//                       description: `This plan requires ${planMinutes.toLocaleString()} minutes, but only ${availableMinutes?.toLocaleString()} minutes are available. Please contact your administrator to request more minutes.`,
//                       variant: "destructive",
//                     });
//                   }
//                   return;
//                 }
//                 setSelected(plan.key);
//               }}
//               disabled={isDisabled}
//               className={`p-[var(--space-xl)] text-left liquid-rounded-xl border transition-all duration-200 ${
//                 isDisabled 
//                   ? "opacity-50 cursor-not-allowed liquid-glass-light border-white/5"
//                   : selected === plan.key
//                   ? "liquid-glass-premium border-white/20"
//                   : "liquid-glass-light border-white/10 hover:liquid-glass-medium"
//               }`}
//             >
//               <div className="flex justify-between items-center mb-[var(--space-md)]">
//                 <h3 className="text-[var(--text-lg)] font-[var(--font-semibold)] text-theme-primary">{plan.name}</h3>
//                 <span className="text-[var(--text-base)] text-theme-primary/90">{plan.price}/mo</span>
//               </div>
//               <ul className="space-y-2 text-[var(--text-sm)] text-theme-secondary">
//                 {plan.features.map(f => (
//                   <li key={f}>• {f}</li>
//                 ))}
//               </ul>
//               <div className="mt-[var(--space-md)] space-y-1">
//                 <div className="text-[var(--text-xs)] text-theme-secondary">
//                   Includes 7-day free trial
//                 </div>
//                 {isDisabled && (
//                   <div className="text-[var(--text-xs)] text-red-400 font-medium space-y-1">
//                     {isUnlimited 
//                       ? "Unlimited plan not available"
//                       : `Requires ${planMinutes.toLocaleString()} min (${availableMinutes?.toLocaleString()} available)`
//                     }
//                     {!isUnlimited && (
//                       <div className="text-[var(--text-xs)] text-yellow-400 mt-1">
//                         Please contact your administrator
//                       </div>
//                     )}
//                   </div>
//                 )}
//                 {availableMinutes !== null && adminMinutes !== null && adminMinutes > 0 && !isDisabled && (
//                   <div className="text-[var(--text-xs)] text-green-400">
//                     {availableMinutes.toLocaleString()} minutes available
//                   </div>
//                 )}
//               </div>
//             </button>
//           );
//         })}
//       </motion.div>

//       <div className="flex gap-[var(--space-md)] pt-[var(--space-lg)]">
//         <Button
//           type="button"
//           variant="ghost"
//           onClick={prevStep}
//           className="liquid-glass-light hover:liquid-glass-medium"
//         >
//           Back
//         </Button>
//         <Button type="button" onClick={handleContinue} className="liquid-button flex-1">
//           Continue
//         </Button>
//       </div>
//     </div>
//   );
// }


import React from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { getPlanConfigs, PLAN_CONFIGS } from "@/lib/plan-config";
import { extractTenantFromHostname } from "@/lib/tenant-utils";
import { useToast } from "@/hooks/use-toast";

export function PricingPlanStep() {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const { toast } = useToast();

  const [selected, setSelected] = React.useState<string>(data.plan || "starter");
  const [plans, setPlans] = React.useState<Array<{
    key: string;
    name: string;
    price: string;
    features: string[];
  }>>([]);
  const [loadingPlans, setLoadingPlans] = React.useState(true);

  // Fetch plans normally (NO MINUTES LOGIC)
  React.useEffect(() => {
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
            price: `$${plan.price}`,
            features: plan.features
          }));

        setPlans(plansList);
      } catch (error) {
        // fallback to static
        const fallback = Object.values(PLAN_CONFIGS)
          .filter(plan => plan.key !== "free")
          .map(plan => ({
            key: plan.key,
            name: plan.name,
            price: `$${plan.price}`,
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

  if (loadingPlans) {
    return (
      <div className="space-y-[var(--space-2xl)]">
        <div className="text-center">
          <h2 className="text-[var(--text-2xl)] font-[var(--font-bold)] text-theme-primary">
            Choose your plan
          </h2>
          <p className="text-[var(--text-base)] text-theme-secondary max-w-xl mx-auto mt-4">
            Loading plans...
          </p>
        </div>
      </div>
    );
  }

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
              <h3 className="text-[var(--text-lg)] font-[var(--font-semibold)] text-theme-primary">
                {plan.name}
              </h3>
              <span className="text-[var(--text-base)] text-theme-primary/90">
                {plan.price}/mo
              </span>
            </div>

            <ul className="space-y-2 text-[var(--text-sm)] text-theme-secondary">
              {plan.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>

            <div className="mt-[var(--space-md)] space-y-1">
              <div className="text-[var(--text-xs)] text-theme-secondary">
                Includes 7-day free trial
              </div>
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
