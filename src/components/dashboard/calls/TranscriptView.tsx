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
            <div key={idx} className={`flex ${entry.speaker === "Agent" || entry.speaker === "AI" ? "justify-end" : "justify-start"}`}>
              <div className={cn(
                "max-w-[85%] p-4 rounded-3xl shadow-lg transition-all duration-300",
                entry.speaker === "Agent" || entry.speaker === "AI"
                  ? "bg-[#3e4a6d]/40 dark:bg-[#3e4a6d]/60 border border-white/10 rounded-tr-lg shadow-blue-900/10"
                  : entry.speaker === "System"
                    ? "bg-amber-100/10 dark:bg-amber-900/20 border border-amber-200/20 dark:border-amber-800/30 rounded-tl-lg"
                    : "bg-zinc-800/60 dark:bg-zinc-900/70 border border-white/5 dark:border-white/5 rounded-tl-lg"
              )}>
                <div className="flex justify-between items-center mb-1.5 gap-4">
                  <span className="font-bold text-xs tracking-wider uppercase opacity-70">
                    {entry.speaker === "AI" ? "Agent" : entry.speaker}
                  </span>
                  <span className="text-[10px] font-medium opacity-50">{entry.time || ""}</span>
                </div>
                <p className="text-[14px] leading-relaxed font-light tracking-tight">{entry.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <p className="text-muted-foreground">No transcript available</p>;
}
