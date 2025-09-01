import React from "react";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { OnboardingProvider } from "@/hooks/useOnboarding";

const gradientBg = "/lovable-uploads/ebe83662-607f-447a-b0ad-6a8dbb3207fa.png";

export default function Onboarding() {
  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${gradientBg})` }}
    >
      {/* Enhanced Overlay for better contrast and blur */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      
      {/* Component Container */}
      <div className="relative z-10">
        <OnboardingProvider>
          <OnboardingLayout />
        </OnboardingProvider>
      </div>
    </div>
  );
}