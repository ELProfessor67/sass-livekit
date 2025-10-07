
import { 
  ThemedDialog,
  ThemedDialogContent, 
  ThemedDialogHeader 
} from "@/components/ui/themed-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, MessageSquare, Headphones } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TranscriptView } from "./TranscriptView";
import { RecordingPlayer } from "./RecordingPlayer";
import { getOutcomeBadge } from "../call-outcomes/utils";
import { formatCallDuration, getCustomerName } from "@/utils/formatUtils";
import { ThemeCard } from "@/components/theme/ThemeCard";
import { formatSummaryForDisplay } from "@/utils/summaryUtils";

interface CallDialogContentProps {
  call: any;
}

export function CallDialogContent({ call }: CallDialogContentProps) {
  return (
    <ThemedDialogContent className="max-w-2xl">
      <ThemedDialogHeader
        title={`Call with ${getCustomerName(call)}`}
      />
      
      {/* Call Details Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ThemeCard variant="default" className="p-3">
                <div className="text-center">
                  <p className="text-xs text-theme-secondary mb-1">Phone</p>
                  <p className="text-sm text-theme-primary">{call.phone_number || call.phoneNumber}</p>
                </div>
              </ThemeCard>
              
              <ThemeCard variant="default" className="p-3">
                <div className="text-center">
                  <p className="text-xs text-theme-secondary mb-1">Time</p>
                  <p className="text-sm text-theme-primary">{new Date(call.created_at || `${call.date}T${call.time}`).toLocaleTimeString()}</p>
                </div>
              </ThemeCard>
              
              <ThemeCard variant="default" className="p-3">
                <div className="text-center">
                  <p className="text-xs text-theme-secondary mb-1">Duration</p>
                  <p className="text-sm text-theme-primary">{formatCallDuration(call.duration || '0s')}</p>
                </div>
              </ThemeCard>
              
              <ThemeCard variant="default" className="p-3 flex items-center justify-center">
                {getOutcomeBadge(call.call_outcome || call.resolution)}
              </ThemeCard>
        </div>
      
      <Tabs defaultValue="summary" className="mt-6">
        <TabsList className="bg-muted/50 border border-border/40">
          <TabsTrigger 
            value="summary" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-theme-primary"
          >
            <FileText size={14} strokeWidth={1.5} />
            Summary
          </TabsTrigger>
          <TabsTrigger 
            value="transcript" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-theme-primary"
          >
            <MessageSquare size={14} strokeWidth={1.5} />
            Transcript
          </TabsTrigger>
          <TabsTrigger 
            value="recording" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-theme-primary"
          >
            <Headphones size={14} strokeWidth={1.5} />
            Recording
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary" className="mt-4">
          <ThemeCard variant="default">
            <CardContent className="p-6">
              <p className="text-sm leading-relaxed text-theme-secondary">{formatSummaryForDisplay(call.summary)}</p>
            </CardContent>
          </ThemeCard>
        </TabsContent>
        
        <TabsContent value="transcript" className="mt-4">
          <ThemeCard variant="default">
            <CardContent className="p-6">
              <TranscriptView transcript={call.transcript} />
            </CardContent>
          </ThemeCard>
        </TabsContent>
        
        <TabsContent value="recording" className="mt-4">
          <ThemeCard variant="default">
            <CardContent className="p-6">
              <RecordingPlayer recording={call.call_recording} duration={call.duration} />
            </CardContent>
          </ThemeCard>
        </TabsContent>
      </Tabs>
    </ThemedDialogContent>
  );
}
