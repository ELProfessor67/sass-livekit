import React from "react";
import { FullScreenSignup } from "@/components/ui/full-screen-signup";

const gradientBg = "/lovable-uploads/ebe83662-607f-447a-b0ad-6a8dbb3207fa.png";

export default function SignUp() {
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${gradientBg})` }}
    >
      {/* Enhanced Overlay for better contrast and blur */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Component Container */}
      <div className="relative z-10">
        <FullScreenSignup />
      </div>
    </div>
  );
}