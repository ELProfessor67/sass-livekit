import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Check } from "phosphor-react";
import { cn } from "@/lib/utils";

import glassDashboard from "@/assets/glass-dashboard.png";
import minimalDashboard from "@/assets/minimal-dashboard.png";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  },
};

const uiStyles = [
  {
    id: "glass" as const,
    name: "Glass",
    tagline: "Modern & immersive",
    description: "Translucent surfaces with blur effects and gradient accents",
    image: glassDashboard
  },
  {
    id: "minimal" as const,
    name: "Classic",
    tagline: "Clean & focused",
    description: "Clean borders, solid backgrounds, and subtle shadows",
    image: minimalDashboard
  }
];

export function PreferencesStep() {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const { setUIStyle } = useTheme();
  const [selectedStyle, setSelectedStyle] = useState<"glass" | "minimal">(
    (data.theme as "glass" | "minimal") || "glass"
  );

  useEffect(() => {
    setUIStyle(selectedStyle);
    updateData({ theme: selectedStyle });
  }, [selectedStyle, setUIStyle]);

  const handleStyleSelect = (style: "glass" | "minimal") => {
    setSelectedStyle(style);
  };

  const handleContinue = () => {
    nextStep();
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-3xl mx-auto space-y-12"
    >
      {/* Header */}
      <div className="text-center">
        <motion.h1
          variants={itemVariants}
          className="text-3xl md:text-4xl font-light text-gray-900 mb-2"
        >
          Customize your experience
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-gray-500"
        >
          Choose the style that feels right. You can always change this later.
        </motion.p>
      </div>

      {/* UI Style Selection Section */}
      <div className="space-y-6">
        <motion.div
          layout
          variants={itemVariants}
          className="aspect-[16/10] rounded-2xl overflow-hidden border-2 border-gray-200 shadow-xl"
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={selectedStyle}
              src={selectedStyle === "glass" ? glassDashboard : minimalDashboard}
              alt={`${selectedStyle === "glass" ? "Glass" : "Classic"} UI Preview`}
              className="w-full h-full object-cover object-top"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            />
          </AnimatePresence>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex justify-center gap-4"
        >
          {uiStyles.map((style) => {
            const isSelected = selectedStyle === style.id;
            return (
              <motion.button
                key={style.id}
                onClick={() => handleStyleSelect(style.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "px-8 py-4 rounded-xl font-medium transition-all duration-300 text-center min-w-[160px] relative",
                  isSelected
                    ? "bg-[#668cff] text-white shadow-lg shadow-[#668cff]/25"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-[#668cff] border-2 border-white rounded-full flex items-center justify-center shadow-md z-10"
                  >
                    <Check size={14} weight="bold" className="text-white" />
                  </motion.div>
                )}
                <span className="block text-lg">{style.name}</span>
                <span className={cn(
                  "block text-xs mt-1",
                  isSelected ? "text-white/80" : "text-gray-400"
                )}>
                  {style.tagline}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Navigation */}
      <motion.div
        variants={itemVariants}
        className="flex gap-4 pt-4"
      >
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          className="h-12 px-8 rounded-xl border-2 border-gray-100 hover:bg-gray-50 text-gray-600 font-medium"
        >
          Back
        </Button>
        <Button
          onClick={handleContinue}
          className="h-12 flex-1 rounded-xl bg-[#668cff] hover:bg-[#5a7ee6] shadow-lg shadow-[#668cff]/25 hover:shadow-xl hover:shadow-[#668cff]/35 transition-all duration-300 font-medium text-white"
        >
          Continue
        </Button>
      </motion.div>
    </motion.div>
  );
}