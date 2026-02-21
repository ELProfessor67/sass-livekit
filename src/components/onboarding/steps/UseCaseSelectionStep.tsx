import React from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useBusinessUseCase } from "@/components/BusinessUseCaseProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BUSINESS_USE_CASE_TEMPLATES, BusinessUseCase } from "@/types/businessUseCase";
import { Target, Check } from "lucide-react";

export function UseCaseSelectionStep() {
  const { data, updateData, nextStep, prevStep } = useOnboarding();
  const { setUseCase } = useBusinessUseCase();

  const handleUseCaseSelect = (useCase: BusinessUseCase) => {
    updateData({ useCase });
    setUseCase(useCase);
  };

  const handleContinue = () => {
    nextStep();
  };

  return (
    <div className="space-y-[var(--space-2xl)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-[var(--space-md)]"
      >
        <div className="flex justify-center mb-[var(--space-md)]">
          <Target className="h-10 w-10 text-[#668cff]" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">
          Choose your primary use case
        </h2>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          This will customize your dashboard terminology, metrics, and outcomes to match your business needs.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="grid gap-[var(--space-lg)]"
      >
        {Object.entries(BUSINESS_USE_CASE_TEMPLATES).map(([key, config], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className={`
              p-[var(--space-xl)] rounded-xl border-2 transition-all duration-300 cursor-pointer
              ${data.useCase === key
                ? 'bg-[#668cff]/10 border-[#668cff] shadow-lg shadow-[#668cff]/10'
                : 'bg-white/60 border-gray-100 hover:border-[#668cff]/40 hover:bg-white'
              }
            `}
            onClick={() => handleUseCaseSelect(key as BusinessUseCase)}
          >
            <div className="flex items-start gap-[var(--space-lg)]">
              <div className="flex-1">
                <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-md)]">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {config.name}
                  </h3>
                  {data.useCase === key && (
                    <div className="p-1 bg-[#668cff]/20 rounded-full">
                      <Check className="h-4 w-4 text-[#668cff]" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-[var(--space-lg)] leading-relaxed">
                  {config.description}
                </p>

                <div className="space-y-[var(--space-md)]">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 mb-[var(--space-sm)] uppercase tracking-wider">
                      Key Metrics
                    </h4>
                    <div className="flex flex-wrap gap-[var(--space-xs)]">
                      {config.metrics.slice(0, 3).map((metric) => (
                        <Badge key={metric.key} variant="outline" className="text-xs bg-white border-gray-200 text-gray-700">
                          {metric.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 mb-[var(--space-sm)] uppercase tracking-wider">
                      Primary Outcomes
                    </h4>
                    <div className="flex flex-wrap gap-[var(--space-xs)]">
                      {config.outcomes.slice(0, 3).map((outcome) => (
                        <Badge key={outcome.key} variant="outline" className="text-xs bg-[#668cff]/10 border-[#668cff]/30 text-[#668cff]">
                          {outcome.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="flex gap-[var(--space-md)] pt-[var(--space-lg)]">
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
          disabled={!data.useCase}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}