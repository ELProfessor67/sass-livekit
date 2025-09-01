import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TranscriptEntry {
  speaker: string;
  time: string;
  text: string;
}

interface InlineTranscriptViewProps {
  transcript: any;
}

export function InlineTranscriptView({ transcript }: InlineTranscriptViewProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!transcript) return null;

  let transcriptData: TranscriptEntry[] = [];

  // Handle different transcript formats
  if (typeof transcript === 'string') {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <FileText className="w-3 h-3 mr-1" />
            Transcript
            {isOpen ? <ChevronDown className="w-3 h-3 ml-1" /> : <ChevronRight className="w-3 h-3 ml-1" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="bg-muted/30 rounded-md p-2 text-[11px] font-mono leading-relaxed max-h-32 overflow-y-auto">
            {transcript}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  if (Array.isArray(transcript)) {
    transcriptData = transcript;
  } else if (transcript?.transcript && Array.isArray(transcript.transcript)) {
    transcriptData = transcript.transcript;
  } else if (typeof transcript === 'object' && transcript !== null) {
    const possibleTranscript = transcript.transcript || transcript.text || transcript.entries;
    if (Array.isArray(possibleTranscript)) {
      transcriptData = possibleTranscript;
    }
  }

  if (transcriptData.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <FileText className="w-3 h-3 mr-1" />
          Transcript
          {isOpen ? <ChevronDown className="w-3 h-3 ml-1" /> : <ChevronRight className="w-3 h-3 ml-1" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="bg-muted/30 rounded-md p-2 max-h-32 overflow-y-auto">
          <div className="space-y-2">
            {transcriptData.map((entry: any, idx: number) => (
              <div key={idx} className="text-[11px] leading-relaxed">
                <span className="font-medium text-foreground">
                  {entry.speaker === "AI" ? "Agent" : entry.speaker}:
                </span>
                <span className="text-muted-foreground ml-1">{entry.text}</span>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}