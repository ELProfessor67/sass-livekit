import React, { useEffect } from "react";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { OnboardingProvider } from "@/hooks/useOnboarding";
import { cn } from "@/lib/utils";

function OnboardingContent() {
  // Set data-page attribute for onboarding-specific styling
  useEffect(() => {
    document.body.setAttribute('data-page', 'onboarding');
    return () => {
      document.body.removeAttribute('data-page');
    };
  }, []);

  return (
    <div className="light min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Base background with smooth transition */}
      <div
        className="absolute inset-0 transition-colors duration-700 ease-in-out bg-gradient-to-br from-[#668cff]/5 via-white to-[#668cff]/10"
      />

      {/* Blur blobs */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#668cff]/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 transition-opacity duration-700 ease-in-out opacity-100"
      />
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#668cff]/6 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 transition-opacity duration-700 ease-in-out opacity-100"
      />
      <div
        className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-[#668cff]/4 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ease-in-out opacity-100"
      />

      {/* Content */}
      <div className="relative z-10 w-full">
        <OnboardingLayout />
      </div>
    </div>
  );
}

export default function Onboarding() {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  );
}