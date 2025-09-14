import { GlassCard } from "@/components/sections/glass-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Palette,
  Crown,
  ArrowRight,
  Check,
  Zap,
  TrendingUp
} from "lucide-react"

export const WhiteLabelSection = () => {
  const partnerBenefits = [
    {
      icon: Zap,
      metric: "0%",
      label: "Technical Overhead",
      description: "No developers or technical team needed"
    },
    {
      icon: TrendingUp,
      metric: "3x",
      label: "Client LTV",
      description: "AI voice agents increase client retention"
    },
    {
      icon: Palette,
      metric: "100%",
      label: "Custom Branding",
      description: "Complete white-label solution with your brand"
    }
  ]

  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <Badge variant="secondary" className="rounded-2xl border text-black border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 mb-6">
            <Crown className="w-4 h-4 mr-2" />
            White-Label Solution
          </Badge>
          <h2 className="text-3xl md:text-5xl font-light tracking-tight mb-6">
            Your Brand<br />
            <span className="text-indigo-500">Our Technology</span>
          </h2>
          <p className="text-lg md:text-xl font-light leading-relaxed text-gray-500 max-w-3xl mx-auto">
            Launch your own AI voice agent platform under your brand. Our complete white-label solution
            gives you everything needed to offer enterprise-grade voice AI to your clients.
          </p>
        </div>

        {/* Partner Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {partnerBenefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <div key={index} className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-[#b7aaff]/5 text-center p-6">
                <div className="inline-flex p-3 rounded-lg bg-[#b7aaff]/10 border border-[#b7aaff]/20 mb-4">
                  <Icon className="w-6 h-6 text-indigo-500" />
                </div>
                <div className="text-3xl font-extralight text-indigo-500 mb-2">
                  {benefit.metric}
                </div>
                <h3 className="text-lg font-light text-black mb-2">
                  {benefit.label}
                </h3>
                <p className="text-base font-normal leading-relaxed text-gray-500">
                  {benefit.description}
                </p>
              </div>
            )
          })}
        </div>


        {/* Partnership CTA */}
        <div className="text-center">
          <div className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-[#b7aaff]/10 relative overflow-hidden p-8">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#b7aaff]/10 via-transparent to-[#b7aaff]/10" />

            <div className="relative z-10">
              <h3 className="text-3xl font-light mb-4">
                Become a White-Label Partner
              </h3>
              <p className="text-lg md:text-xl font-light leading-relaxed text-gray-500 mb-8 max-w-2xl mx-auto">
                Launch your AI voice agent service in 48 hours. No technical team required,
                no development costs. Start capturing new revenue opportunities immediately.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center  items-center mb-8">
                <Button size="lg" className="px-8 py-3  text-black bg-indigo-400 hover:bg-indigo-300 text-lg">
                  Apply for Partnership
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button variant="outline" size="lg" className="px-8 py-3 text-black text-lg bg-[#f9fafa]/40 backdrop-blur-lg border border-[#ffffff] hover:scale-105 hover:border-[#b7aaff]/30 hover:bg-indigo-300 " style={{ background: 'linear-gradient(135deg, hsl(240 5% 98%/ 0.6), hsl(240 5% 98%/ 0.2))' }}>
                  Schedule Partnership Call
                </Button>
              </div>

              <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500" />
                  <span>Dedicated partner manager</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500" />
                  <span>Technical onboarding support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-500" />
                  <span>Marketing co-op programs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}