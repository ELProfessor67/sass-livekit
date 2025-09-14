import { GlassCard } from "@/components/sections/glass-card"
import { Badge } from "@/components/ui/badge"
import { Check, Star, Zap, Crown, Calculator } from "lucide-react"

export const PricingSection = () => {
  const plans = [
    {
      name: "Starter",
      price: "$299",
      period: "/month",
      description: "Perfect for small businesses getting started with AI voice agents",
      variant: "default" as const,
      features: [
        "Up to 500 calls/month",
        "Basic AI voice agent",
        "Standard integrations",
        "Email support",
        "Analytics dashboard",
        "Custom greetings"
      ],
      roi: "$2,500",
      roiLabel: "Monthly ROI",
      popular: false
    },
    {
      name: "Professional",
      price: "$799",
      period: "/month",
      description: "Advanced features for growing teams that need more power",
      variant: "premium" as const,
      features: [
        "Up to 2,500 calls/month",
        "Advanced AI with NLP",
        "All integrations included",
        "Priority support",
        "Advanced analytics",
        "A/B testing",
        "Custom voice training",
        "Multi-language support"
      ],
      roi: "$8,500",
      roiLabel: "Monthly ROI",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "Tailored solutions for large organizations with custom needs",
      variant: "enterprise" as const,
      features: [
        "Unlimited calls",
        "Custom AI development",
        "White-label solution",
        "Dedicated account manager",
        "Advanced security",
        "Custom reporting",
        "SLA guarantees",
        "24/7 phone support"
      ],
      roi: "$50,000+",
      roiLabel: "Monthly ROI",
      popular: false
    }
  ]

  return (
    <section className="py-24 px-4 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="rounded-2xl  text-black border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 mb-6">
            <Calculator className="w-4 h-4 mr-2" />
            ROI-Focused Pricing
          </Badge>
          <h2 className="text-3xl md:text-5xl font-light tracking-tight mb-6">
            Pricing That Scales
            <br />
            <span className="text-indigo-500">With Your Success</span>
          </h2>
          <p className="text-lg md:text-xl font-light leading-relaxed text-gray-500 max-w-3xl mx-auto mb-8">
            Every plan pays for itself. Our customers typically see 300-500% ROI within the first quarter.
          </p>

          {/* ROI Calculator Teaser */}
          <div className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 inline-block mb-8 p-4">
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-indigo-500" />
              <span className="text-sm font-medium">Calculate your potential ROI</span>
              <button className="px-3 py-1 bg-[#b7aaff] text-[#0d0e11] text-xs rounded-md hover:bg-[#b7aaff]/90 transition-colors">
                Free Calculator
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 hover:scale-105 relative p-6 ${plan.popular ? 'ring-2 ring-[#9c8bfd]/30 scale-105' : ''}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-[#b7aaff] text-[#0d0e11]">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-light text-black mb-2">{plan.name}</h3>
                <div className="flex items-end justify-center gap-1 mb-3">
                  <span className="text-4xl font-extralight text-indigo-500">{plan.price}</span>
                  <span className="text-sm text-gray-500 mb-1">{plan.period}</span>
                </div>
                <p className="text-sm text-gray-500">{plan.description}</p>
              </div>

              {/* ROI Highlight */}
              <div className="text-center mb-6">
                <Badge variant="outline" className="bg-success/10 border-success/30 text-success">
                  {plan.roi} {plan.roiLabel}
                </Badge>
              </div>

              {/* Features List */}
              <div className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#b7aaff]/20 border border-[#b7aaff]/30 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-indigo-500" />
                    </div>
                    <span className="text-sm text-gray-500">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button className={`w-full py-3 rounded-lg font-medium transition-all duration-300 ${plan.popular
                ? 'bg-indigo-500 text-[#0d0e11] hover:bg-[#b7aaff]/90 shadow-lg hover:shadow-xl hover:shadow-[#b7aaff]/25'
                : 'glass-button hover:border-[#b7aaff]/30'
                }`}>
                {plan.price === "Custom" ? "Contact Sales" : "Start Free Trial"}
              </button>

              {/* Money-back guarantee */}
              <p className="text-xs text-center text-gray-500 mt-3">
                30-day money-back guarantee
              </p>
            </div>
          ))}
        </div>

        {/* Additional Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 text-center p-6">
            <Zap className="w-8 h-8 text-black mx-auto mb-3" />
            <h4 className="font-medium text-indigo-500 mb-2">Setup in Minutes</h4>
            <p className="text-sm text-gray-500">No technical expertise required. We handle the setup for you.</p>
          </div>

          <div className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 text-center p-6">
            <Crown className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
            <h4 className="font-medium text-black mb-2">No Long-term Contracts</h4>
            <p className="text-sm text-gray-500">Cancel anytime. Month-to-month flexibility with enterprise security.</p>
          </div>

          <div className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 text-center p-6">
            <Star className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
            <h4 className="font-medium text-black mb-2">Dedicated Success Manager</h4>
            <p className="text-sm text-gray-500">Personal support to maximize your ROI and growth potential.</p>
          </div>
        </div>

      </div>
    </section>
  )
}