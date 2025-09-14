import { GlassCard } from "@/components/sections/glass-card"
import { Badge } from "@/components/ui/badge"
import { Star, Quote, TrendingUp, Users, Award } from "lucide-react"

export const SocialProofSection = () => {
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "VP of Sales",
      company: "TechFlow Solutions",
      content: "Our lead conversion rate jumped from 12% to 52% in just 3 months. The AI agents handle initial qualification better than our human reps.",
      metric: "340% ROI",
      avatar: "SC"
    },
    {
      name: "Marcus Rodriguez",
      role: "CEO",
      company: "GrowthLabs",
      content: "We went from missing 60% of after-hours calls to capturing every single lead. It's like having a sales team that never sleeps.",
      metric: "$1.2M additional revenue",
      avatar: "MR"
    },
    {
      name: "Emily Watson",
      role: "Customer Success Director",
      company: "ScaleUp Inc",
      content: "The consistency is incredible. Every customer gets the same premium experience, and our satisfaction scores increased by 40%.",
      metric: "40% satisfaction increase",
      avatar: "EW"
    }
  ]

  const stats = [
    { icon: Users, value: "50,000+", label: "Active Users" },
    { icon: TrendingUp, value: "99.9%", label: "Uptime SLA" },
    { icon: Star, value: "4.9/5", label: "Customer Rating" },
    { icon: Award, value: "15+", label: "Industry Awards" }
  ]

  const companies = [
    { name: "TechFlow", industry: "Technology" },
    { name: "SalesForce Pro", industry: "Sales" },
    { name: "CustomerFirst", industry: "Support" },
    { name: "GrowthLabs", industry: "Marketing" },
    { name: "ScaleUp Inc", industry: "SaaS" },
    { name: "CallCenter Elite", industry: "Services" }
  ]

  return (
    <section className="py-24 px-4 relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#b7aaff]/3 to-transparent" />

      <div className="site-container relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="glass-card mb-6">
            <Star className="w-4 h-4 mr-2" />
            Customer Success Stories
          </Badge>
          <h2 className="section-heading mb-6">
            Trusted by Industry Leaders
          </h2>
          <p className="body-large text-white/80 max-w-3xl mx-auto">
            See why thousands of businesses trust our AI voice agents to drive their growth and customer satisfaction.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <GlassCard key={index} variant="light" className="text-center">
                <Icon className="w-8 h-8 text-white mx-auto mb-3" />
                <div className="text-2xl font-light text-white mb-1">{stat.value}</div>
                <div className="text-sm text-white/70">{stat.label}</div>
              </GlassCard>
            )
          })}
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <GlassCard key={index} variant="premium" size="lg" hover className="group relative">
              {/* Quote Icon */}
              <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity">
                <Quote className="w-8 h-8 text-indigo-500" />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#b7aaff] text-indigo-500" />
                ))}
              </div>

              {/* Testimonial Content */}
              <blockquote className="body-text text-white/80 mb-6 relative z-10">
                "{testimonial.content}"
              </blockquote>

              {/* Author Info */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#b7aaff]/20 border border-[#b7aaff]/30 flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-500">{testimonial.avatar}</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">{testimonial.name}</div>
                  <div className="text-sm text-white/70">{testimonial.role}</div>
                  <div className="text-sm font-medium text-[#f3f3fa]">{testimonial.company}</div>
                </div>
              </div>

              {/* Result Badge */}
              <div className="mt-4 pt-4 border-t border-glass-[#d8d9e8]/30">
                <Badge variant="outline" className="bg-success/10 border-success/30 text-success">
                  {testimonial.metric}
                </Badge>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Company Logos */}
        <GlassCard variant="light" size="lg">
          <div className="text-center mb-8">
            <h3 className="text-lg font-light text-white mb-2">
              Powering success across industries
            </h3>
            <p className="caption text-white/70">
              From startups to Fortune 500 companies
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
            {companies.map((company, index) => (
              <div key={index} className="text-center group">
                <div className="text-lg font-light text-white/80 group-hover:text-[#f3f3fa] transition-colors mb-1">
                  {company.name}
                </div>
                <div className="text-xs text-white/50">
                  {company.industry}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <GlassCard variant="enterprise" className="inline-block">
            <h3 className="text-xl font-light mb-4 text-white">
              Join thousands of satisfied customers
            </h3>
            <p className="body-text text-white/80 mb-6">
              See why industry leaders choose our AI voice agents for their growth strategy.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="px-6 py-2 bg-[#b7aaff] text-[#0d0e11] rounded-lg font-medium hover:bg-[#b7aaff]/90 transition-colors">
                Read More Success Stories
              </button>
              <button className="px-6 py-2 glass-button rounded-lg font-medium">
                Start Your Success Story
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  )
}