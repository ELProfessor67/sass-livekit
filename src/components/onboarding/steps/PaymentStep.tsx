import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Check,
  ArrowLeft,
  Tag,
  Info,
  ShieldCheck,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { getPlanConfigs, PlanConfig } from "@/lib/plan-config";
import { extractTenantFromHostname } from "@/lib/tenant-utils";
import { supabase } from "@/integrations/supabase/client";

export function PaymentStep() {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Fetch plan config
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoadingPlan(true);
        const tenant = extractTenantFromHostname();
        const tenantSlug = tenant === "main" ? null : tenant;
        const planConfigs = await getPlanConfigs(tenantSlug);
        const plan =
          planConfigs[data.plan?.toLowerCase() || "starter"] ||
          planConfigs.starter;
        setSelectedPlan(plan);
      } catch (err) {
        console.error("Error fetching plan config:", err);
        setSelectedPlan(null);
      } finally {
        setLoadingPlan(false);
      }
    };

    fetchPlan();
  }, [data.plan]);

  // Listen for payment result from the Stripe-hosted tab via BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel("stripe-payment");

    channel.onmessage = (event) => {
      if (event.data?.type === "payment_success") {
        setWaitingForPayment(false);
        setPaymentSuccess(true);
        updateData({ subscriptionStatus: "active" });
        setTimeout(() => nextStep(), 1500);
      } else if (event.data?.type === "payment_cancelled") {
        setWaitingForPayment(false);
        setError("Payment was cancelled. You can try again.");
      }
    };

    return () => channel.close();
  }, [nextStep, updateData]);

  const handleOpenStripe = async () => {
    if (!selectedPlan) return;

    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("You must be logged in to subscribe.");
        setIsLoading(false);
        return;
      }

      const successUrl = `${window.location.origin}/payment-callback?success=true`;
      const cancelUrl = `${window.location.origin}/payment-callback?success=false`;

      const response = await fetch(
        "/api/v1/subscription/create-checkout-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            plan: selectedPlan.key,
            planName: selectedPlan.name,
            planPrice: selectedPlan.price,
            successUrl,
            cancelUrl,
          }),
        }
      );

      const result = await response.json();

      if (!result.success || !result.url) {
        setError(result.error || "Failed to create checkout session.");
        setIsLoading(false);
        return;
      }

      // Open Stripe Checkout in a new tab
      window.open(result.url, "_blank");
      setWaitingForPayment(true);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingPlan || !selectedPlan) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-[#668cff]/20 border-t-[#668cff] rounded-full animate-spin" />
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center space-y-6 py-20 text-center"
      >
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center border-4 border-white shadow-xl">
          <Check className="h-10 w-10 text-green-500" strokeWidth={3} />
        </div>
        <div className="space-y-2">
          <h3 className="text-3xl font-bold text-gray-900 tracking-tight">
            Payment Successful
          </h3>
          <p className="text-gray-500 text-lg">
            Activating your {selectedPlan.name} plan...
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto overflow-hidden bg-white shadow-2xl rounded-[2.5rem] flex flex-col md:flex-row border border-gray-100">
      {/* Sidebar (Order Summary) */}
      <div className="w-full md:w-[42%] bg-[#668cff] p-8 md:p-12 text-white flex flex-col relative overflow-hidden">
        {/* Background Decorative Circles */}
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-5%] left-[-5%] w-48 h-48 bg-black/10 rounded-full blur-3xl" />

        <button
          onClick={prevStep}
          className="flex items-center gap-2 text-white/80 hover:text-white mb-12 transition-colors group"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Go back</span>
        </button>

        <div className="relative z-10 flex-1 flex flex-col">
          <div className="space-y-2 mb-8">
            <p className="text-white/70 font-medium">
              Subscribe to {selectedPlan.name}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold tracking-tight">
                ${selectedPlan.price}.00
              </span>
              <span className="text-white/60 text-lg">per month</span>
            </div>
          </div>

          <div className="space-y-6 mt-12">
            <div className="flex justify-between items-center py-4 border-b border-white/10">
              <div className="space-y-0.5">
                <p className="font-semibold text-lg">{selectedPlan.name} Plan</p>
                <p className="text-sm text-white/50">Billed monthly</p>
              </div>
              <p className="font-bold text-lg">${selectedPlan.price}.00</p>
            </div>

            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <p className="text-white/70">Subtotal</p>
              <p className="font-semibold text-lg">${selectedPlan.price}.00</p>
            </div>

            <button className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium py-1 group">
              <Tag
                size={16}
                className="group-hover:rotate-12 transition-transform"
              />
              Add promotion code
            </button>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5 text-white/60">
                <span>Tax</span>
                <Info size={14} />
              </div>
              <span className="text-white/50 text-right">
                Enter address to calculate
              </span>
            </div>

            <Separator className="bg-white/10 my-6" />

            <div className="flex justify-between items-center pt-2">
              <p className="text-xl font-medium text-white/90">
                Total due today
              </p>
              <p className="text-3xl font-bold tracking-tighter">
                ${selectedPlan.price}.00
              </p>
            </div>
          </div>

          <div className="mt-auto pt-12 flex items-center gap-3 opacity-60">
            <ShieldCheck size={20} />
            <p className="text-sm">Secure checkout hosted by SupportAccess</p>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="flex-1 bg-white p-8 md:p-12 lg:p-16 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full space-y-10">
          <div className="space-y-3">
            <h4 className="text-2xl font-bold text-gray-900 tracking-tight">
              Complete your payment
            </h4>
            <p className="text-gray-500 leading-relaxed">
              You'll be securely redirected to Stripe to enter your payment
              details. Once complete, you'll be brought back here automatically.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#668cff]/10 flex items-center justify-center">
                <CreditCard size={20} className="text-[#668cff]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Stripe Checkout</p>
                <p className="text-sm text-gray-500">
                  Industry-leading payment security
                </p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Check size={14} className="text-green-500 shrink-0" />
                All major credit &amp; debit cards accepted
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-green-500 shrink-0" />
                256-bit SSL encryption
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-green-500 shrink-0" />
                Cancel anytime from your billing settings
              </li>
            </ul>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          {waitingForPayment ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700">
                <Loader2 size={18} className="animate-spin shrink-0" />
                <p className="text-sm font-medium">
                  Waiting for payment confirmation from Stripe...
                </p>
              </div>
              <button
                onClick={() => setWaitingForPayment(false)}
                className="text-sm text-gray-400 hover:text-gray-600 underline transition-colors"
              >
                Cancel and try again
              </button>
            </div>
          ) : (
            <Button
              onClick={handleOpenStripe}
              disabled={isLoading}
              className="w-full h-16 rounded-[1.25rem] bg-[#668cff] hover:bg-[#5a7ee6] text-white font-bold text-xl shadow-xl shadow-[#668cff]/20 hover:shadow-2xl hover:shadow-[#668cff]/30 transition-all duration-300 transform active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <ExternalLink size={22} />
                  <span>Pay with Stripe</span>
                </div>
              )}
            </Button>
          )}

          <div className="flex items-center justify-center gap-4 text-xs font-semibold text-gray-400 grayscale opacity-70">
            <div className="flex items-center gap-1.5 border-r border-gray-200 pr-4">
              <span>Powered by</span>
              <span className="text-gray-600 font-bold tracking-tighter text-lg -mt-1">
                stripe
              </span>
            </div>
            <div className="flex gap-4 uppercase tracking-widest">
              <button type="button" className="hover:text-gray-600 transition-colors">
                Terms
              </button>
              <button type="button" className="hover:text-gray-600 transition-colors">
                Privacy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
