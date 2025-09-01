import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { ThemeCard } from "@/components/theme";
import { useBusinessUseCase } from "@/components/BusinessUseCaseProvider";
import { BUSINESS_USE_CASE_TEMPLATES, BusinessUseCase } from "@/types/businessUseCase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BusinessUseCaseSettings() {
  const { useCase: currentUseCase, setUseCase } = useBusinessUseCase();

  const handleUseCaseChange = (newUseCase: BusinessUseCase) => {
    setUseCase(newUseCase);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extralight tracking-wide text-theme-primary mb-2">
          Business Use Case
        </h2>
        <p className="text-theme-secondary font-light">
          Choose your business type to customize metrics, terminology, and dashboard layout for your specific needs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.values(BUSINESS_USE_CASE_TEMPLATES).map((template) => (
          <motion.div
            key={template.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative"
          >
            <ThemeCard 
              variant="default" 
              interactive
              className={`cursor-pointer transition-all duration-200 ${
                currentUseCase === template.id 
                  ? 'ring-2 ring-primary shadow-lg' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleUseCaseChange(template.id)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-theme-primary mb-1">
                      {template.name}
                    </h3>
                    <p className="text-sm text-theme-secondary font-light">
                      {template.description}
                    </p>
                  </div>
                  {currentUseCase === template.id && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-theme-primary mb-2">Key Metrics</h4>
                    <div className="flex flex-wrap gap-1">
                      {template.metrics.slice(0, 3).map((metric) => (
                        <Badge key={metric.key} variant="secondary" className="text-xs">
                          {metric.label}
                        </Badge>
                      ))}
                      {template.metrics.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.metrics.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-theme-primary mb-2">Primary Outcomes</h4>
                    <div className="flex flex-wrap gap-1">
                      {template.outcomes.slice(0, 2).map((outcome) => (
                        <Badge key={outcome.key} variant="secondary" className="text-xs">
                          {outcome.label}
                        </Badge>
                      ))}
                      {template.outcomes.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.outcomes.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ThemeCard>
          </motion.div>
        ))}
      </div>

      <div className="pt-4 border-t border-theme-border">
        <p className="text-sm text-theme-secondary font-light">
          You can change your business use case at any time. Your existing data will be automatically mapped to the new terminology and metrics.
        </p>
      </div>
    </div>
  );
}