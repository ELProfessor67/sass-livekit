import React from "react";
import { cn } from "@/lib/utils";

interface TranscriptEntry {
  speaker: string;
  time: string;
  text: string;
}

interface TranscriptViewProps {
  transcript: any;
}

export function TranscriptView({ transcript }: TranscriptViewProps) {
  if (typeof transcript === 'string') {
    return <pre className="whitespace-pre-wrap font-mono text-sm">{transcript}</pre>;
  }

  let transcriptData: TranscriptEntry[] = [];

  // Handle different transcript formats
  if (Array.isArray(transcript)) {
    transcriptData = transcript;
  } else if (transcript?.transcript && Array.isArray(transcript.transcript)) {
    transcriptData = transcript.transcript;
  } else if (typeof transcript === 'object' && transcript !== null) {
    // Try to extract transcript data from nested object structure
    const possibleTranscript = transcript.transcript || transcript.text || transcript.entries;
    if (Array.isArray(possibleTranscript)) {
      transcriptData = possibleTranscript;
    }
  }

  if (transcriptData.length > 0) {
    return (
      <div className="max-h-[50vh] overflow-y-auto pr-4">
        <div className="space-y-4">
          {transcriptData.map((entry: any, idx: number) => (
            <div key={idx} className={cn("flex", (entry.speaker === "Agent" || entry.speaker === "AI") ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] p-3 rounded-xl border backdrop-blur-md shadow-glass-sm",
                (entry.speaker === "Agent" || entry.speaker === "AI")
                  ? "bg-primary/20 border-primary/30 text-white"
                  : entry.speaker === "System"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-200"
                    : "bg-zinc-950/90 border-white/[0.08] text-white"
              )}>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-sm">{entry.speaker === "AI" ? "Agent" : entry.speaker}</span>
                  <span className="text-xs text-muted-foreground">{entry.time || ""}</span>
                </div>
                <p className="text-sm leading-relaxed">{entry.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <p className="text-muted-foreground">No transcript available</p>;
}
