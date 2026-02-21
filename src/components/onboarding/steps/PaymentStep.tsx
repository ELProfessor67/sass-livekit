import React, { useState } from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Lock, Check } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import { getPlanConfigs, PlanConfig } from "@/lib/plan-config";
import { extractTenantFromHostname } from "@/lib/tenant-utils";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#111827',
      backgroundColor: 'transparent',
      '::placeholder': {
        color: '#9ca3af',
      },
      padding: '12px 16px',
    },
    invalid: {
      color: '#ef4444',
    },
    complete: {
      color: '#10b981',
    },
  },
  hidePostalCode: false,
};

function PaymentForm() {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [billingEmail, setBillingEmail] = useState(data.email || "");

  // Fetch the correct plan config based on tenant
  React.useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoadingPlan(true);
        const tenant = extractTenantFromHostname();
        const tenantSlug = tenant === 'main' ? null : tenant;
        const planConfigs = await getPlanConfigs(tenantSlug);
        const plan = planConfigs[data.plan?.toLowerCase() || 'starter'] || planConfigs.starter;
        setSelectedPlan(plan);
        console.log(`[PaymentStep] Loaded plan: ${plan.name} ($${plan.price}) for tenant: ${tenantSlug || 'main'}`);
      } catch (error) {
        console.error('Error fetching plan config:', error);
        // Fallback to default plan
        const { getPlanConfig } = await import("@/lib/plan-config");
        setSelectedPlan(getPlanConfig(data.plan));
      } finally {
        setLoadingPlan(false);
      }
    };

    fetchPlan();
  }, [data.plan]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      // Get the card element
      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        setPaymentError("Card element not found");
        setIsProcessing(false);
        return;
      }

      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          email: billingEmail,
          name: data.name,
        },
      });

      if (error) {
        setPaymentError(error.message || "Payment method creation failed");
        setIsProcessing(false);
        return;
      }

      // Payment method created successfully
      console.log("Payment method created:", paymentMethod);

      setPaymentSuccess(true);

      // Extract card details for storage
      const cardDetails = paymentMethod.card;

      // Update onboarding data with payment info and card details
      updateData({
        paymentMethodId: paymentMethod.id,
        cardBrand: cardDetails?.brand,
        cardLast4: cardDetails?.last4,
        cardExpMonth: cardDetails?.exp_month,
        cardExpYear: cardDetails?.exp_year,
        email: billingEmail,
        subscriptionStatus: 'active'
      });

      // Move to next step after a brief delay
      setTimeout(() => {
        nextStep();
      }, 1500);

    } catch (err) {
      setPaymentError("An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loadingPlan || !selectedPlan) {
    return (
      <div className="space-y-[var(--space-2xl)]">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-[var(--space-sm)]">
            Complete Your Subscription
          </h2>
          <p className="text-lg text-gray-500">
            Loading plan details...
          </p>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h3>
          <p className="text-lg text-gray-500">
            Your {selectedPlan.name} plan has been activated. Redirecting...
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-[var(--space-2xl)]">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-[var(--space-sm)]">
          Complete Your Subscription
        </h2>
        <p className="text-lg text-gray-500">
          Enter your payment details to activate your {selectedPlan.name} plan
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-[var(--space-xl)]">
        {/* Plan Summary */}
        <Card className="bg-white/60 border-2 border-gray-100 shadow-xl rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 text-xl">
              <CreditCard className="h-5 w-5 text-[#668cff]" />
              Plan Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold text-gray-900">{selectedPlan.name} Plan</span>
              <span className="text-2xl font-bold text-[#668cff]">${selectedPlan.price}</span>
            </div>
            <Separator className="bg-gray-200" />
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900">What's included:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {selectedPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#668cff] flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-4 border-t border-gray-200 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Billing cycle</span>
                <span className="text-gray-900 font-medium">Monthly</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-500">Next billing date</span>
                <span className="text-gray-900 font-medium">
                  {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card className="bg-white border-2 border-[#668cff]/20 shadow-xl shadow-[#668cff]/10 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#668cff]" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 text-xl">
              <Lock className="h-5 w-5 text-[#668cff]" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="mt-1 h-12 bg-white/60 hover:bg-white focus:bg-white border-2 border-gray-100 focus:border-[#668cff] focus:ring-4 focus:ring-[#668cff]/10 transition-all rounded-xl text-gray-900"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Card Information
                  </Label>
                  <div className="mt-2 p-3 bg-white border-2 border-gray-100 focus-within:border-[#668cff] focus-within:ring-4 focus-within:ring-[#668cff]/10 transition-all rounded-xl">
                    <CardElement options={cardElementOptions} />
                  </div>
                </div>
              </div>

              {paymentError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-sm text-red-500">{paymentError}</p>
                </div>
              )}

              <div className="flex gap-[var(--space-md)] pt-[var(--space-lg)]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="h-12 flex-1 rounded-xl border-2 border-gray-100 ring-0 hover:bg-gray-50 text-gray-600 font-medium"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={!stripe || isProcessing}
                  className="h-12 flex-1 rounded-xl bg-[#668cff] hover:bg-[#5a7ee6] shadow-lg shadow-[#668cff]/25 hover:shadow-xl hover:shadow-[#668cff]/35 transition-all duration-300 font-medium text-white"
                >
                  {isProcessing ? "Processing..." : `Subscribe for $${selectedPlan.price}/month`}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
          <Lock className="h-4 w-4" />
          Your payment information is secure and encrypted
        </p>
      </div>
    </div>
  );
}

export function PaymentStep() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm />
    </Elements>
  );
}
