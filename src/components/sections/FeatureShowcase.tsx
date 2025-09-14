import { GlassCard } from "@/components/sections/glass-card";
import { Badge } from "@/components/ui/badge";
import { Play, Mic, Brain, Zap, Globe, Settings, ArrowRight } from "lucide-react";
export const FeatureShowcase = () => {
  const features = [{
    icon: Brain,
    title: "Advanced AI Intelligence",
    description: "Natural language processing that understands context, emotions, and intent with human-like precision.",
    benefits: ["95% conversation accuracy", "Context-aware responses", "Emotional intelligence", "Learning from interactions"],
    demo: "Watch AI Demo"
  }, {
    icon: Mic,
    title: "Voice Synthesis",
    description: "Crystal-clear, natural voice that adapts tone and pace to match your brand personality.",
    benefits: ["Multiple voice options", "Brand voice training", "Accent customization"],
    demo: "Hear Voice Samples"
  }, {
    icon: Zap,
    title: "Instant Integration",
    description: "Connect with your existing tools and workflows in minutes, not months.",
    benefits: ["200+ integrations", "API-first approach", "Real-time sync"],
    demo: "View Integrations"
  }, {
    icon: Globe,
    title: "Global Reach",
    description: "Support customers worldwide with multi-language capabilities and timezone intelligence.",
    benefits: ["50+ languages", "Regional accents", "Cultural awareness"],
    demo: "Language Demo"
  }, {
    icon: Settings,
    title: "Custom Workflows",
    description: "Build sophisticated conversation flows that guide customers exactly where you want them.",
    benefits: ["Visual flow builder", "Conditional logic", "A/B testing"],
    demo: "Builder Tour"
  }];
  return <section className="py-24 px-4 relative">
    {/* Background Effects */}
    <div className="absolute inset-0 bg-gradient-to-b from-[#b7aaff]/5 via-transparent to-[#b7aaff]/5" />

    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      {/* Section Header */}
      <div className="text-center mb-16">
        <Badge variant="secondary" className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 mb-6">
          <Zap className="w-4 h-4 mr-2" />
          Advanced Features
        </Badge>
        <h2 className="text-3xl md:text-5xl font-light tracking-tight mb-6">
          Enterprise-Grade AI
          <br />
          <span className="text-indigo-500">That Actually Works</span>
        </h2>
        <p className="text-lg md:text-xl font-light leading-relaxed text-gray-500 max-w-3xl mx-auto">
          Built for scale, designed for results. Every feature is engineered to drive conversions and deliver exceptional customer experiences.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return <div key={index} className={`rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 hover:scale-105 group relative overflow-hidden p-6 ${index === 0 ? 'hover:shadow-2xl hover:shadow-[#b7aaff]/5' : ''}`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-4 right-4 w-32 h-32 border border-[#b7aaff]/20 rounded-full" />
              <div className="absolute bottom-4 left-4 w-20 h-20 border border-[#b7aaff]/10 rounded-full" />
            </div>

            <div className="relative z-10">
              {/* Icon Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 rounded-xl bg-[#b7aaff]/10 border border-[#b7aaff]/20 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-8 h-8 text-indigo-500" />
                </div>
                {index === 0 && <Badge variant="outline" className="bg-[#b7aaff]/10 border-[#b7aaff]/30">
                  Core Feature
                </Badge>}
              </div>

              {/* Content */}
              <h3 className="text-xl font-light text-black mb-3">
                {feature.title}
              </h3>
              <p className="text-base font-normal leading-relaxed text-gray-500 mb-6">
                {feature.description}
              </p>

              {/* Benefits List */}
              <div className="space-y-2 mb-6">
                {feature.benefits.map((benefit, benefitIndex) => <div key={benefitIndex} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#b7aaff]/60" />
                  <span className="text-sm text-gray-500">{benefit}</span>
                </div>)}
              </div>

              {/* Demo Button */}
              <button className="group/btn flex items-center gap-2 text-indigo-500 font-medium text-sm hover:text-indigo-500/80 transition-colors">
                <Play className="w-4 h-4" />
                <span>{feature.demo}</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>;
        })}
      </div>

      {/* Interactive Demo Section */}

    </div>
  </section>;
};