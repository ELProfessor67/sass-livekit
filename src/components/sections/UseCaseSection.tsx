import { GlassCard } from "@/components/sections/glass-card"
import { Badge } from "@/components/ui/badge"
import { Phone, MessageCircle, Users, UserCheck, TrendingUp, ArrowRight } from "lucide-react"

export const UseCaseSection = () => {
  const useCases = [
    {
      icon: TrendingUp,
      title: "Sales Teams",
      subtitle: "Close More Deals",
      description: "Boost your sales performance with AI voice agents that handle outbound calls, qualify leads, and follow up automatically.",
      benefits: [
        "Outbound calling automation",
        "Lead qualification & scoring",
        "Follow-up sequences",
        "CRM integration"
      ],
      variant: "premium" as const,
      cta: "Boost Sales"
    },
    {
      icon: MessageCircle,
      title: "Marketing Agencies",
      subtitle: "Personalized Campaigns",
      description: "Scale your marketing efforts with AI agents that deliver personalized campaign responses and nurture leads 24/7.",
      benefits: [
        "Automated campaign responses",
        "Lead nurturing sequences",
        "Personalized messaging",
        "Multi-channel follow-ups"
      ],
      variant: "enterprise" as const,
      cta: "Scale Marketing"
    },
    {
      icon: Users,
      title: "Customer Service",
      subtitle: "24/7 Support",
      description: "Provide exceptional customer service with AI agents that handle inquiries instantly and escalate when needed.",
      benefits: [
        "Instant inquiry handling",
        "24/7 availability",
        "Smart escalation",
        "Customer satisfaction tracking"
      ],
      variant: "ultra" as const,
      cta: "Enhance Support"
    },
    {
      icon: UserCheck,
      title: "Recruitment",
      subtitle: "Automated Screening",
      description: "Streamline your hiring process with AI agents that screen candidates, schedule interviews, and provide instant responses.",
      benefits: [
        "Candidate screening automation",
        "Interview scheduling",
        "Instant responses",
        "Qualification scoring"
      ],
      variant: "light" as const,
      cta: "Automate Hiring"
    }
  ]

  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 lg:mb-16">
          <Badge variant="secondary" className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 mb-6">
            <Users className="w-4 h-4 mr-2" />
            Use Cases
          </Badge>
          <h2 className="text-3xl md:text-5xl font-light tracking-tight mb-6">
            Perfect for Every Agency Need
          </h2>
          <p className="text-lg md:text-xl font-light leading-relaxed text-gray-500 max-w-3xl mx-auto">
            Our white-label AI voice agents are designed to excel across all business functions.
            Choose your focus area and watch your agency deliver exceptional results for clients.
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon
            return (
              <div
                key={index}
                className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden group p-6"
              >
                {/* Background Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#b7aaff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 rounded-lg bg-[#b7aaff]/10 border border-[#b7aaff]/20">
                      <Icon className="w-6 h-6 text-indigo-500" />
                    </div>
                    {index === 0 && (
                      <Badge variant="outline" className="text-xs text-black bg-[#b7aaff]/10 border-[#b7aaff]/30">
                        Most Popular
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <h3 className="text-xl font-light text-black mb-1">
                        {useCase.title}
                      </h3>
                      <div className="text-2xl font-extralight text-indigo-500">
                        {useCase.subtitle}
                      </div>
                    </div>
                    <p className="body-text text-gray-500">
                      {useCase.description}
                    </p>
                  </div>

                  {/* Benefits List */}
                  <div className="space-y-2 mb-6">
                    {useCase.benefits.map((benefit, benefitIndex) => (
                      <div key={benefitIndex} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#b7aaff]/60" />
                        <span className="text-gray-500">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <button className="w-full px-4 py-2 bg-[#f9fafa]/40 backdrop-blur-lg border border-[#d8d9e8]/50 rounded-lg font-medium group-hover:bg-[#b7aaff]/10 transition-colors flex items-center justify-center gap-2 hover:scale-105 hover:border-[#b7aaff]/30" style={{ background: 'linear-gradient(135deg, hsl(240 5% 98%/ 0.6), hsl(240 5% 98%/ 0.2))' }}>
                    {useCase.cta}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-[#b7aaff]/5 inline-block p-6">
            <p className="text-base font-normal leading-relaxed mb-4">
              <span className="text-indigo-500 font-medium">Ready to transform your agency operations?</span>
              <br />
              See how our AI voice agents can work for your specific use case.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="px-6 py-2 bg-[#b7aaff] text-[#0d0e11] rounded-lg font-medium hover:bg-[#b7aaff]/90 transition-colors">
                Schedule Demo
              </button>
              <button className="px-6 py-2 bg-[#f9fafa]/40 backdrop-blur-lg border border-[#d8d9e8]/50 rounded-lg font-medium hover:scale-105 hover:border-[#b7aaff]/30" style={{ background: 'linear-gradient(135deg, hsl(240 5% 98%/ 0.6), hsl(240 5% 98%/ 0.2))' }}>
                View All Features
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}