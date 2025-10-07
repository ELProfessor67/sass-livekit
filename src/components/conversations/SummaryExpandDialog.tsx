import React from "react";
import { ThemedDialog, ThemedDialogContent, ThemedDialogHeader, ThemedDialogTrigger } from "@/components/ui/themed-dialog";
import { formatSummaryForDisplay } from "@/utils/summaryUtils";

interface SummaryExpandDialogProps {
  summary: string;
  trigger: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SummaryExpandDialog({ 
  summary, 
  trigger, 
  open, 
  onOpenChange 
}: SummaryExpandDialogProps) {
  return (
    <ThemedDialog open={open} onOpenChange={onOpenChange}>
      <ThemedDialogTrigger asChild>
        {trigger}
      </ThemedDialogTrigger>
      <ThemedDialogContent className="sm:max-w-2xl max-h-[85vh]">
        <ThemedDialogHeader
          title="Call Summary"
          description="Full conversation summary with detailed information"
        />
        <div className="mt-4 overflow-hidden">
          <div className="p-4 bg-muted/30 rounded-lg border border-border/20 max-h-[60vh] overflow-y-auto">
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {formatSummaryForDisplay(summary)}
            </p>
          </div>
        </div>
      </ThemedDialogContent>
    </ThemedDialog>
  );
}
