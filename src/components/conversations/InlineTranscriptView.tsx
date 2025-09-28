import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileText, ExternalLink } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TranscriptExpandDialog } from "./TranscriptExpandDialog";

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
      <div>
        <div className="flex items-center gap-1">
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
          </Collapsible>
          <TranscriptExpandDialog
            transcript={transcript}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                title="Expand transcript"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            }
          />
        </div>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent className="mt-2">
            <div className="space-y-2 max-h-32 overflow-y-auto">
              <div className="px-3 py-2 rounded-xl backdrop-blur-sm border text-[11px] leading-relaxed message-bubble-incoming">
                <span className="font-medium text-foreground">Transcript:</span>
                <span className="text-muted-foreground ml-1">{transcript}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
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
    <div>
      <div className="flex items-center gap-1">
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
        </Collapsible>
        <TranscriptExpandDialog
          transcript={transcript}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Expand transcript"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          }
        />
      </div>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="mt-2">
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {transcriptData.map((entry: any, idx: number) => {
              const isIncoming = entry.speaker === "Customer" || entry.speaker === "customer";
              return (
                <div key={idx} className={`flex ${isIncoming ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-xl backdrop-blur-sm border text-[11px] leading-relaxed ${
                    isIncoming
                      ? 'message-bubble-incoming'
                      : 'message-bubble-outgoing'
                  }`}>
                    <span className="font-medium text-foreground">
                      {entry.speaker === "AI" ? "Agent" : entry.speaker}:
                    </span>
                    <span className="text-muted-foreground ml-1">{entry.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}