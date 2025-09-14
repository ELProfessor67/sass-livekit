import { GlassCard } from "@/components/sections/glass-card"
import { GlassButton } from "@/components/sections/glass-button"
import { Badge } from "@/components/ui/badge"
import { VoiceDemo } from "@/components/ui/voice-demo"
import { Play, ArrowRight, Users, Tag, Wand2, Shield } from "lucide-react"

// Hero section component
export const HeroSection = () => {
  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing')
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center px-4 pt-20 overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#b7aaff]/5 via-transparent to-transparent" />
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-[#b7aaff]/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#b7aaff]/5 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Social Proof Badge */}
        <div className="flex justify-center mb-8 animate-[fadeInUp_0.6s_ease-out_forwards]">
          <Badge variant="secondary" className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 text-black px-6 py-2 text-sm font-light">
            <Users className="w-4 h-4 mr-2" />
            Trusted by 50,000+ businesses worldwide
          </Badge>
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-extralight tracking-tight leading-tight mb-8 animate-[fadeInUp_0.6s_ease-out_forwards] font-extrabold" style={{ animationDelay: "0.1s" }}>
          Ultimate <span className="text-indigo-400">Conversational AI</span>
          <br />
          Solution for Agencies
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl font-light leading-relaxed text-gray-500 max-w-3xl mx-auto mb-8 animate-[fadeInUp_0.6s_ease-out_forwards]" style={{ animationDelay: "0.2s" }}>
          Plug-and-play voice AI that agencies can white-label instantly. Easily create AI voice agents for outbound calling, inbound support, and automated scheduling - all under your brand. No coding required.
        </p>

        {/* Voice Demo */}
        <div className="mb-12 animate-[fadeInUp_0.6s_ease-out_forwards]" style={{ animationDelay: "0.25s" }}>
          <VoiceDemo />
        </div>

        {/* CTA Button */}
        <div className="flex justify-center mb-16 animate-[fadeInUp_0.6s_ease-out_forwards]" style={{ animationDelay: "0.3s" }}>
          <GlassButton
            variant="primary"
            size="xl"
            className="group bg-indigo-300"
            onClick={scrollToPricing}
          >
            Get Started for Free
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </GlassButton>
        </div>

        {/* Value Proposition Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-[fadeInUp_0.6s_ease-out_forwards]" style={{ animationDelay: "0.4s" }}>
          <div className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 text-center p-6">
            <div className="flex items-center justify-center mb-3">
              <Tag className="w-6 h-6 text-indigo-500 mr-2" />
              <span className="text-lg font-medium text-indigo-500">White Label Ready</span>
            </div>
            <p className="text-sm text-gray-500">Complete branding control</p>
          </div>

          <div className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 text-center p-6">
            <div className="flex items-center justify-center mb-3">
              <Wand2 className="w-6 h-6 text-indigo-500 mr-2" />
              <span className="text-lg font-medium text-indigo-500">No Coding Required</span>
            </div>
            <p className="text-sm text-gray-500">Setup in minutes, not months</p>
          </div>

          <div className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 text-center p-6">
            <div className="flex items-center justify-center mb-3">
              <Shield className="w-6 h-6 text-indigo-500 mr-2" />
              <span className="text-lg font-medium text-indigo-500">Enterprise Grade</span>
            </div>
            <p className="text-sm text-gray-500">Reliable, secure, scalable</p>
          </div>
        </div>

        {/* Trusted Companies */}
        <div className="mt-20 mb-16 animate-[fadeInUp_0.6s_ease-out_forwards]" style={{ animationDelay: "0.5s" }}>
          <p className="text-sm font-light text-gray-500 text-center mb-8">Trusted by industry leaders</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            {["TechCorp", "SalesFlow", "CustomerFirst", "GrowthLabs", "ScaleUp"].map((company) => (
              <div key={company} className="text-lg font-light tracking-wide">
                {company}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}