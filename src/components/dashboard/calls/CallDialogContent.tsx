
import {
  ThemedDialog,
  ThemedDialogContent,
  ThemedDialogHeader
} from "@/components/ui/themed-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ChatCircle, Headphones } from "phosphor-react";
import { TranscriptView } from "./TranscriptView";
import { RecordingPlayer } from "./RecordingPlayer";
import { getOutcomeBadge } from "../call-outcomes/utils";
import { formatCallDuration, getCustomerName } from "@/utils/formatUtils";
import { ThemeCard } from "@/components/theme/ThemeCard";
import { formatSummaryForDisplay } from "@/utils/summaryUtils";
import { useRecording } from "@/hooks/useRecording";

interface CallDialogContentProps {
  call: any;
}

export function CallDialogContent({ call }: CallDialogContentProps) {
  const { recording: fetchedRecording, loading: isRecordingLoading } = useRecording(
    !call.call_recording ? call.call_sid : undefined
  );

  const recordingUrl = call.call_recording || fetchedRecording?.recordingUrl;

  return (
    <ThemedDialogContent className="max-w-2xl">
      <ThemedDialogHeader
        title={`Call with ${getCustomerName(call)}`}
      />

      {/* Call Details Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Phone</p>
            <p className="text-sm text-foreground">{call.phone_number || call.phoneNumber}</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Time</p>
            <p className="text-sm text-foreground">{new Date(call.created_at || `${call.date}T${call.time}`).toLocaleTimeString()}</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Duration</p>
            <p className="text-sm text-foreground">{formatCallDuration(call.duration || '0s')}</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border/20 flex items-center justify-center">
          {getOutcomeBadge(call.call_outcome || call.resolution)}
        </div>
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
            <ChatCircle size={14} weight="duotone" />
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
          <div className="p-4 rounded-lg bg-muted/20 border border-border/10">
            <p className="text-sm leading-relaxed text-muted-foreground">{call.summary}</p>
          </div>
        </TabsContent>

        <TabsContent value="transcript" className="mt-4">
          <div className="p-4 rounded-lg bg-muted/20 border border-border/10">
            <TranscriptView transcript={call.transcript} />
          </div>
        </TabsContent>

        <TabsContent value="recording" className="mt-4">
          <ThemeCard variant="glass">

            {isRecordingLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <RecordingPlayer recording={recordingUrl} duration={call.duration} />
            )}

          </ThemeCard>
        </TabsContent>
      </Tabs>
    </ThemedDialogContent>
  );
}
