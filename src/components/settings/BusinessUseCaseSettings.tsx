import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useBusinessUseCase } from "@/components/BusinessUseCaseProvider";
import { BUSINESS_USE_CASE_TEMPLATES, BusinessUseCase } from "@/types/businessUseCase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BusinessUseCaseSettings() {
  const { canEdit } = useWorkspace();
  const { useCase: currentUseCase, setUseCase } = useBusinessUseCase();

  const handleUseCaseChange = (newUseCase: BusinessUseCase) => {
    setUseCase(newUseCase);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.values(BUSINESS_USE_CASE_TEMPLATES).map((template) => (
          <motion.div
            key={template.id}
            whileHover={{ y: -4 }}
            className="h-full"
          >
            <Card
              className={`h-full transition-all duration-300 border-white/[0.08] backdrop-blur-xl bg-white/[0.02] overflow-hidden group ${currentUseCase === template.id
                  ? 'ring-2 ring-primary bg-primary/[0.03]'
                  : canEdit ? 'hover:bg-white/[0.04] cursor-pointer' : 'opacity-80'
                }`}
              onClick={() => canEdit && handleUseCaseChange(template.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-medium text-foreground group-hover:text-primary transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-light">
                      {template.description}
                    </p>
                  </div>
                  {currentUseCase === template.id ? (
                    <div className="flex-shrink-0">
                      <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full border border-white/[0.1] flex items-center justify-center group-hover:border-primary/50 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-white/[0.05] group-hover:bg-primary/30 transition-colors" />
                    </div>
                  )}
                </div>

                <div className="space-y-5 pt-4 border-t border-white/[0.05]">
                  <div>
                    <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Key Metrics</h4>
                    <div className="flex flex-wrap gap-2">
                      {template.metrics.slice(0, 3).map((metric) => (
                        <Badge key={metric.key} variant="outline" className="text-[10px] bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05] transition-colors">
                          {metric.label}
                        </Badge>
                      ))}
                      {template.metrics.length > 3 && (
                        <Badge variant="outline" className="text-[10px] bg-white/[0.01] border-white/[0.05]">
                          +{template.metrics.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Primary Outcomes</h4>
                    <div className="flex flex-wrap gap-2">
                      {template.outcomes.slice(0, 2).map((outcome) => (
                        <Badge key={outcome.key} variant="outline" className="text-[10px] bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05] transition-colors">
                          {outcome.label}
                        </Badge>
                      ))}
                      {template.outcomes.length > 2 && (
                        <Badge variant="outline" className="text-[10px] bg-white/[0.01] border-white/[0.05]">
                          +{template.outcomes.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="pt-6 mt-4 border-t border-white/[0.08]">
        <div className="p-4 rounded-xl bg-primary/[0.02] border border-primary/[0.05]">
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            <span className="text-primary font-medium mr-1.5">Note:</span>
            You can change your business use case at any time. Your existing data will be automatically mapped to the new terminology and metrics.
          </p>
        </div>
      </div>
    </div>
  );
}