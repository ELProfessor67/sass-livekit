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
          <div className="p-[var(--space-md)] liquid-glass-light liquid-rounded-full">
            <Target className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-[var(--text-2xl)] font-[var(--font-bold)] text-theme-primary">
          Choose your primary use case
        </h2>
        <p className="text-[var(--text-base)] text-theme-secondary max-w-xl mx-auto">
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
              p-[var(--space-xl)] liquid-rounded-xl border transition-all duration-300 cursor-pointer
              ${data.useCase === key
                ? 'liquid-glass-premium border-primary/30 shadow-[var(--shadow-glass-md)]'
                : 'liquid-glass-light border-white/5 hover:liquid-glass-medium hover:border-white/10'
              }
            `}
            onClick={() => handleUseCaseSelect(key as BusinessUseCase)}
          >
            <div className="flex items-start gap-[var(--space-lg)]">
              <div className="flex-1">
                <div className="flex items-center gap-[var(--space-md)] mb-[var(--space-md)]">
                  <h3 className="text-[var(--text-lg)] font-[var(--font-semibold)] text-theme-primary">
                    {config.name}
                  </h3>
                  {data.useCase === key && (
                    <div className="p-1 liquid-glass-premium liquid-rounded-full">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
                <p className="text-[var(--text-sm)] text-theme-secondary mb-[var(--space-lg)] leading-relaxed">
                  {config.description}
                </p>
                
                <div className="space-y-[var(--space-md)]">
                  <div>
                    <h4 className="text-[var(--text-xs)] font-[var(--font-medium)] text-theme-primary mb-[var(--space-sm)] uppercase tracking-wider">
                      Key Metrics
                    </h4>
                    <div className="flex flex-wrap gap-[var(--space-xs)]">
                      {config.metrics.slice(0, 3).map((metric) => (
                        <Badge key={metric.key} variant="outline" className="text-[var(--text-xs)] liquid-glass-light border-white/20">
                          {metric.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-[var(--text-xs)] font-[var(--font-medium)] text-theme-primary mb-[var(--space-sm)] uppercase tracking-wider">
                      Primary Outcomes
                    </h4>
                    <div className="flex flex-wrap gap-[var(--space-xs)]">
                      {config.outcomes.slice(0, 3).map((outcome) => (
                        <Badge key={outcome.key} variant="outline" className="text-[var(--text-xs)] liquid-glass-light border-white/20">
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
          variant="ghost"
          onClick={prevStep}
          className="liquid-glass-light hover:liquid-glass-medium"
        >
          Back
        </Button>
        <Button
          onClick={handleContinue}
          className="liquid-button flex-1"
          disabled={!data.useCase}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}