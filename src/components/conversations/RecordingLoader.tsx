import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Music } from "lucide-react";

interface RecordingLoaderProps {
  callSid: string;
}

export function RecordingLoader({ callSid }: RecordingLoaderProps) {
  return (
    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Music className="w-4 h-4" />
          Recording Details
        </h4>
        <Badge variant="outline" className="text-xs">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Loading...
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground">
        Fetching recording from Twilio for call: {callSid}
      </div>
    </div>
  );
}

