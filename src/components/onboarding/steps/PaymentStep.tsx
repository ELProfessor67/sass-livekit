import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Lock,
  Check,
  ArrowLeft,
  Tag,
  Info,
  ShieldCheck,
  Globe
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import { getPlanConfigs, PlanConfig } from "@/lib/plan-config";
import { extractTenantFromHostname } from "@/lib/tenant-utils";
import { cn } from "@/lib/utils";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#32325d',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a',
    },
  },
  hidePostalCode: true,
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
  const [cardholderName, setCardholderName] = useState(data.name || "");

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoadingPlan(true);
        const tenant = extractTenantFromHostname();
        const tenantSlug = tenant === 'main' ? null : tenant;
        const planConfigs = await getPlanConfigs(tenantSlug);
        const plan = planConfigs[data.plan?.toLowerCase() || 'starter'] || planConfigs.starter;
        setSelectedPlan(plan);
      } catch (error) {
        console.error('Error fetching plan config:', error);
        setSelectedPlan(null);
      } finally {
        setLoadingPlan(false);
      }
    };

    fetchPlan();
  }, [data.plan]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setPaymentError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setPaymentError("Card element not found");
        setIsProcessing(false);
        return;
      }

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          email: billingEmail,
          name: cardholderName,
        },
      });

      if (error) {
        setPaymentError(error.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      setPaymentSuccess(true);

      updateData({
        paymentMethodId: paymentMethod.id,
        cardBrand: paymentMethod.card?.brand,
        cardLast4: paymentMethod.card?.last4,
        cardExpMonth: paymentMethod.card?.exp_month,
        cardExpYear: paymentMethod.card?.exp_year,
        email: billingEmail,
        subscriptionStatus: 'active'
      });

      setTimeout(() => {
        nextStep();
      }, 1500);

    } catch (err) {
      setPaymentError("An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
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
          <h3 className="text-3xl font-bold text-gray-900 tracking-tight">Payment Successful</h3>
          <p className="text-gray-500 text-lg">Activating your {selectedPlan.name} plan...</p>
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
            <p className="text-white/70 font-medium">Subscribe to {selectedPlan.name}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold tracking-tight">${selectedPlan.price}.00</span>
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
              <Tag size={16} className="group-hover:rotate-12 transition-transform" />
              Add promotion code
            </button>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5 text-white/60">
                <span>Tax</span>
                <Info size={14} />
              </div>
              <span className="text-white/50 text-right">Enter address to calculate</span>
            </div>

            <Separator className="bg-white/10 my-6" />

            <div className="flex justify-between items-center pt-2">
              <p className="text-xl font-medium text-white/90">Total due today</p>
              <p className="text-3xl font-bold tracking-tighter">${selectedPlan.price}.00</p>
            </div>
          </div>

          <div className="mt-auto pt-12 flex items-center gap-3 opacity-60">
            <ShieldCheck size={20} />
            <p className="text-sm">Secure checkout hosted by SupportAccess</p>
          </div>
        </div>
      </div>

      {/* Main Payment Section */}
      <div className="flex-1 bg-white p-8 md:p-12 lg:p-16">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-12">

          {/* Contact Info Section */}
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-gray-900 tracking-tight">Contact information</h4>
            <div className="space-y-2">
              <div className="relative group">
                <Input
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="h-14 pl-4 pr-32 bg-gray-50/50 border-gray-200 focus:border-[#668cff] focus:ring-4 focus:ring-[#668cff]/5 transition-all rounded-xl text-gray-900 text-base"
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 border-l border-gray-200 pl-4">
                  <span className="text-sm font-medium text-[#668cff] cursor-pointer hover:underline">
                    Continue with Link
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Section */}
          <div className="space-y-8">
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-gray-900 tracking-tight">Payment method</h4>
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 w-fit px-3 py-1.5 rounded-full border border-gray-100">
                <CreditCard size={14} className="text-[#668cff]" />
                <span className="font-semibold">Bank card</span>
              </div>
            </div>

            <div className="p-6 bg-white border-2 border-gray-100 rounded-[1.5rem] shadow-sm space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-900 tracking-tight">Card information</Label>
                <div className="p-4 bg-gray-50/50 border border-gray-200 rounded-xl focus-within:border-[#668cff] focus-within:ring-4 focus-within:ring-[#668cff]/5 transition-all">
                  <CardElement options={cardElementOptions} />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-900 tracking-tight">Cardholder name</Label>
                <Input
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder="Full name on card"
                  className="h-14 bg-gray-50/50 border-gray-200 focus:border-[#668cff] focus:ring-4 focus:ring-[#668cff]/5 transition-all rounded-xl text-gray-900 text-base"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-900 tracking-tight">Billing address</Label>
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <Globe size={18} />
                    </div>
                    <select className="flex h-14 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-11 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-[#668cff]/5 focus:border-[#668cff] disabled:cursor-not-allowed disabled:opacity-50 appearance-none text-gray-900 font-medium">
                      <option>United States</option>
                      <option>United Kingdom</option>
                      <option>Canada</option>
                      <option>Germany</option>
                      <option>France</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                  <Input
                    placeholder="Address"
                    className="h-14 bg-gray-50/50 border-gray-200 focus:border-[#668cff] focus:ring-4 focus:ring-[#668cff]/5 transition-all rounded-xl text-gray-900 text-base"
                  />
                  <button type="button" className="text-sm font-medium text-[#668cff] hover:underline pl-1 transition-colors">
                    Enter address manually
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="space-y-6 text-center">
            {paymentError && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 animate-shake">
                {paymentError}
              </div>
            )}

            <Button
              type="submit"
              disabled={!stripe || isProcessing}
              className="w-full h-16 rounded-[1.25rem] bg-[#668cff] hover:bg-[#5a7ee6] text-white font-bold text-xl shadow-xl shadow-[#668cff]/20 hover:shadow-2xl hover:shadow-[#668cff]/30 transition-all duration-300 transform active:scale-[0.98]"
            >
              {isProcessing ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                `Subscribe`
              )}
            </Button>

            <div className="space-y-4">
              <p className="text-xs text-gray-400 leading-relaxed px-4">
                By subscribing, you authorize SupportAccess to charge you according to the terms until you cancel.
              </p>

              <div className="flex items-center justify-center gap-4 text-xs font-semibold text-gray-400 pt-2 grayscale opacity-70">
                <div className="flex items-center gap-1.5 border-r border-gray-200 pr-4">
                  <span>Powered by</span>
                  <span className="text-gray-600 font-bold tracking-tighter text-lg -mt-1">stripe</span>
                </div>
                <div className="flex gap-4 uppercase tracking-widest">
                  <button type="button" className="hover:text-gray-600 transition-colors">Terms</button>
                  <button type="button" className="hover:text-gray-600 transition-colors">Privacy</button>
                </div>
              </div>
            </div>
          </div>
        </form>
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
