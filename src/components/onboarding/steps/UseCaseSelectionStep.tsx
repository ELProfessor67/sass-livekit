import React from "react";
import { motion, Variants } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useBusinessUseCase } from "@/components/BusinessUseCaseProvider";
import { Button } from "@/components/ui/button";
import { BUSINESS_USE_CASE_TEMPLATES, BusinessUseCase } from "@/types/businessUseCase";
import { Check } from "phosphor-react";

// Animation variants for the container and items
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
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

// Map existing use cases to emojis for the new UI
const useCaseIcons: Record<BusinessUseCase, string> = {
  "appointment-setting": "📅",
  "customer-service": "🎧",
  "recruitment": "👥",
  "ecommerce": "🛒",
  "general": "🏢"
};

export function UseCaseSelectionStep() {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const { setUseCase } = useBusinessUseCase();

  const handleUseCaseSelect = (useCase: BusinessUseCase) => {
    updateData({ useCase });
    setUseCase(useCase);
  };

  const handleContinue = () => {
    if (data.useCase) {
      nextStep();
    }
  };

  const firstName = data.name?.split(' ')[0] || "there";

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Header section with personalized greeting */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="text-center mb-8"
      >
        <motion.h1
          variants={itemVariants}
          className="text-3xl md:text-4xl font-light text-gray-900 mb-3"
        >
          What brings you here, <span className="text-[#668cff]">{firstName}</span>?
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-gray-500 text-lg"
        >
          I'll tailor everything to match your goals.
        </motion.p>
      </motion.div>

      {/* Grid of use case cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3"
      >
        {Object.entries(BUSINESS_USE_CASE_TEMPLATES).map(([key, config], index) => {
          const isSelected = data.useCase === key;
          const icon = useCaseIcons[key as BusinessUseCase] || "💡";

          return (
            <motion.button
              key={key}
              variants={itemVariants}
              onClick={() => handleUseCaseSelect(key as BusinessUseCase)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left group ${isSelected
                  ? "border-[#668cff] bg-[#668cff]/5 shadow-lg shadow-[#668cff]/10"
                  : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                }`}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-5 h-5 bg-[#668cff] rounded-full flex items-center justify-center"
                >
                  <Check size={12} weight="bold" className="text-white" />
                </motion.div>
              )}
              <span className="text-2xl mb-2 block">{icon}</span>
              <span className={`text-sm font-medium ${isSelected ? "text-gray-900" : "text-gray-500 group-hover:text-gray-700"}`}>
                {config.name}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 space-y-3"
      >
        <Button
          onClick={handleContinue}
          className="w-full h-12 rounded-xl bg-[#668cff] hover:bg-[#5a7ee6] shadow-lg shadow-[#668cff]/25 hover:shadow-xl hover:shadow-[#668cff]/35 transition-all duration-300 font-medium text-white"
          disabled={!data.useCase}
        >
          Sounds good
        </Button>

        <button
          onClick={prevStep}
          className="w-full text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Go back
        </button>
      </motion.div>
    </div>
  );
}