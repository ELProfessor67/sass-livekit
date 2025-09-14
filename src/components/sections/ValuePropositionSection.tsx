import { GlassCard } from "@/components/sections/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Clock, Target, Zap, Phone, Settings, Users, Gauge } from "lucide-react";

export const ValuePropositionSection = () => {
  const valueProps = [{
    icon: Clock,
    title: "Setup in Minutes",
    subtitle: "Get started instantly",
    description: "Build and deploy AI voice agents in under 5 minutes. No technical expertise required. Start capturing leads today with our intuitive drag-and-drop builder.",
    benefits: ["Drag-and-drop builder", "Pre-built templates", "Instant deployment", "No coding required"],
    metric: "5-min setup",
    bgColor: "from-blue-500/10 to-purple-500/10",
    visualIcon: Settings
  }, {
    icon: Bot,
    title: "Never Miss a Call",
    subtitle: "24/7 availability",
    description: "Your AI agents work around the clock, answering every call instantly. Capture leads while you sleep and your competitors miss opportunities.",
    benefits: ["24/7 availability", "Instant response", "Multi-call handling", "Zero missed opportunities"],
    metric: "100% coverage",
    bgColor: "from-green-500/10 to-emerald-500/10",
    visualIcon: Phone
  }, {
    icon: Target,
    title: "White-Label Solution",
    subtitle: "Your brand, your success",
    description: "Completely customizable and brandable. Your clients will never know it's not your own proprietary technology. Build your agency with confidence.",
    benefits: ["Custom branding", "Your domain", "White-label dashboard", "Reseller opportunities"],
    metric: "100% branded",
    bgColor: "from-orange-500/10 to-red-500/10",
    visualIcon: Users
  }, {
    icon: Zap,
    title: "Seamless Integrations",
    subtitle: "Connect everything",
    description: "Connect with 100+ tools including CRMs, calendars, payment systems, and marketing platforms. Data flows automatically where you need it.",
    benefits: ["100+ integrations", "Real-time sync", "API connectivity", "Workflow automation"],
    metric: "100+ tools",
    bgColor: "from-purple-500/10 to-pink-500/10",
    visualIcon: Gauge
  }];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#b7aaff]/5 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-24">
          <Badge variant="secondary" className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 mb-6">
            <Target className="w-4 h-4 mr-2" />
            Core Value Propositions
          </Badge>
          <h2 className="text-3xl md:text-5xl font-light tracking-tight mb-6">
            Connect with Customers
            <br />
            <span className="text-indigo-500">Effortlessly</span>
          </h2>
          <p className="text-lg md:text-xl font-light leading-relaxed text-white/80 max-w-3xl mx-auto">
            Build, brand, and deploy intelligent voice agents that work around the clock. From setup to success in minutes, not months.
          </p>
        </div>

        {/* True Zigzag Feature Sections */}
        <div className="space-y-0">
          {valueProps.map((prop, index) => {
            const Icon = prop.icon;
            const VisualIcon = prop.visualIcon;
            const isEven = index % 2 === 0;

            return (
              <section key={index} className={`relative py-24 ${index > 0 ? 'border-t border-white/10' : ''}`}>
                {/* Section Background */}
                <div className={`absolute inset-0 bg-gradient-to-r ${prop.bgColor} opacity-20`} />

                {/* Content Container */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                  <div className={`flex flex-col lg:flex-row items-center gap-16 ${!isEven ? 'lg:flex-row-reverse' : ''}`}>
                    {/* Content Side */}
                    <div className="flex-1 space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="p-4 rounded-2xl bg-[#b7aaff]/20 border border-[#b7aaff]/30">
                            <Icon className="w-8 h-8 text-indigo-500" />
                          </div>
                          <Badge variant="outline" className="bg-[#b7aaff]/10 border-[#b7aaff]/30 text-indigo-500">
                            {prop.metric}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <p className="text-indigo-500 text-sm font-medium uppercase tracking-wider">
                            {prop.subtitle}
                          </p>
                          <h3 className="text-4xl lg:text-5xl font-light text-white mb-4">
                            {prop.title}
                          </h3>
                        </div>

                        <p className="text-xl text-white/80 leading-relaxed max-w-xl">
                          {prop.description}
                        </p>
                      </div>

                      {/* Benefits List */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {prop.benefits.map((benefit, benefitIndex) => (
                          <div key={benefitIndex} className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#b7aaff]" />
                            <span className="text-white/70">{benefit}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA */}
                      <Button variant="outline" className="group bg-white/5 border-white/20 text-white hover:bg-white/10">
                        Learn More
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>

                    {/* Visual Side */}
                    <div className="flex-1">
                      <div className="rounded-2xl border border-[#d8d9e8]/30 bg-[#d8d9e8]/10 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl hover:shadow-[#b7aaff]/5 group">
                        <div className="flex items-center justify-center h-80">
                          <div className="relative">
                            <div className="absolute inset-0 bg-[#b7aaff]/20 rounded-full blur-2xl scale-150" />
                            <div className="relative p-12 rounded-3xl bg-gradient-to-br from-[#b7aaff]/20 to-[#b7aaff]/5 border border-[#b7aaff]/30">
                              <VisualIcon className="w-24 h-24 text-indigo-500" />
                            </div>
                          </div>
                        </div>

                        {/* Floating Elements */}
                        <div className="absolute top-8 right-8 p-3 rounded-xl bg-[#b7aaff]/10 border border-[#b7aaff]/20">
                          <Icon className="w-6 h-6 text-indigo-500" />
                        </div>

                        <div className="absolute bottom-8 left-8 px-4 py-2 rounded-full bg-[#b7aaff]/20 border border-[#b7aaff]/30">
                          <span className="text-indigo-500 text-sm font-medium">{prop.metric}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
};