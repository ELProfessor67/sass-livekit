
import { FeatureShowcase } from "@/components/sections/FeatureShowcase";
import { FinalCTASection } from "@/components/sections/FinalCTASection";
import { HeroSection } from "@/components/sections/HeroSection";
import { IntegrationsSection } from "@/components/sections/IntegrationsSection";
import { NeverMissCallSection } from "@/components/sections/NeverMissCallSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { UseCaseSection } from "@/components/sections/UseCaseSection";
import { ValuePropositionSection } from "@/components/sections/ValuePropositionSection";
import { WhiteLabelSection } from "@/components/sections/WhiteLabelSection";
import { FloatingNav } from "@/components/ui/floating-nav";
import { TopCTA } from "@/components/ui/top-cta";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <FloatingNav />
      <TopCTA />

      {/* Hero - Pure White */}
      <div className="bg-white text-[#0f0f13]">
        <HeroSection />
      </div>

      {/* Never Miss Call - Dark Gradient */}
      <div className="bg-gradient-to-b from-black via-slate-900 to-[hsl(238,100%,74%)] text-white">
        <NeverMissCallSection />
      </div>

      {/* Use Cases - Pure White */}
      <div className="bg-white text-[#0f0f13]">
        <UseCaseSection />
      </div>

      {/* Value Proposition - Black */}
      <div className="bg-black text-white">
        <ValuePropositionSection />
      </div>

      {/* Feature Showcase - White */}
      <div className="bg-white text-[#0f0f13]">
        <FeatureShowcase />
      </div>

      {/* White-Label - Pure White */}
      <div className="bg-white text-[#0f0f13]">
        <WhiteLabelSection />
      </div>

      {/* Integrations - Pure White */}
      <div className="bg-white text-[#0f0f13]">
        <IntegrationsSection />
      </div>

      {/* Pricing - Pure White */}
      <div id="pricing" className="bg-white text-[#0f0f13]">
        <PricingSection />
      </div>

      {/* Final CTA - Light Brand */}
      <div className="bg-indigo-100 text-[#0f0f13]">
        <FinalCTASection />
      </div>
    </div>
  );
};

export default LandingPage;
