import React from "react";
import { TranscriptView } from "./TranscriptView";
import {
  ThemedDialog,
  ThemedDialogContent,
  ThemedDialogHeader,
  ThemedDialogTrigger,
} from "@/components/ui/themed-dialog";

interface TranscriptExpandDialogProps {
  transcript: any;
  trigger: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TranscriptExpandDialog({ 
  transcript, 
  trigger, 
  open, 
  onOpenChange 
}: TranscriptExpandDialogProps) {
  return (
    <ThemedDialog open={open} onOpenChange={onOpenChange}>
      <ThemedDialogTrigger asChild>
        {trigger}
      </ThemedDialogTrigger>
      <ThemedDialogContent className="sm:max-w-4xl max-h-[85vh]">
        <ThemedDialogHeader
          title="Call Transcript"
          description="Full conversation transcript with detailed speaker attribution"
        />
        <div className="mt-4 overflow-hidden">
          <TranscriptView transcript={transcript} />
        </div>
      </ThemedDialogContent>
    </ThemedDialog>
  );
}
