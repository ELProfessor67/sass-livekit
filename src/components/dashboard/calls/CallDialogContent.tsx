
import {
  ThemedDialog,
  ThemedDialogContent,
  ThemedDialogHeader
} from "@/components/ui/themed-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ChatCircle, MusicNotes } from "phosphor-react";
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
        <ThemeCard variant="glass" className="p-3">
          <div className="text-center">
            <p className="text-xs text-theme-secondary mb-1">Phone</p>
            <p className="text-sm text-theme-primary">{call.phone_number || call.phoneNumber}</p>
          </div>
        </ThemeCard>

        <ThemeCard variant="glass" className="p-3">
          <div className="text-center">
            <p className="text-xs text-theme-secondary mb-1">Time</p>
            <p className="text-sm text-theme-primary">{new Date(call.created_at || `${call.date}T${call.time}`).toLocaleTimeString()}</p>
          </div>
        </ThemeCard>

        <ThemeCard variant="glass" className="p-3">
          <div className="text-center">
            <p className="text-xs text-theme-secondary mb-1">Duration</p>
            <p className="text-sm text-theme-primary">{formatCallDuration(call.duration || '0s')}</p>
          </div>
        </ThemeCard>

        <ThemeCard variant="glass" className="p-3 flex items-center justify-center">
          {getOutcomeBadge(call.call_outcome || call.resolution)}
        </ThemeCard>
      </div>

      <Tabs defaultValue="summary" className="mt-8">
        <TabsList className="bg-white/5 dark:bg-white/10 backdrop-blur-md border border-white/10 p-1.5 h-auto gap-1 rounded-2xl">
          <TabsTrigger
            value="summary"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-white transition-all"
          >
            <FileText size={16} weight="bold" />
            Summary
          </TabsTrigger>
          <TabsTrigger
            value="transcript"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-white transition-all"
          >
            <ChatCircle size={16} weight="bold" />
            Transcript
          </TabsTrigger>
          <TabsTrigger
            value="recording"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-white transition-all"
          >
            <MusicNotes size={16} weight="bold" />
            Recording
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <ThemeCard variant="glass">
            <CardContent className="p-6">
              <p className="text-sm leading-relaxed text-theme-secondary">{formatSummaryForDisplay(call.summary)}</p>
            </CardContent>
          </ThemeCard>
        </TabsContent>

        <TabsContent value="transcript" className="mt-4">
          <ThemeCard variant="glass">
            <CardContent className="p-6">
              <TranscriptView transcript={call.transcript} />
            </CardContent>
          </ThemeCard>
        </TabsContent>

        <TabsContent value="recording" className="mt-4">
          <ThemeCard variant="glass">
            <CardContent className="p-6">
              <RecordingPlayer recording={call.call_recording} duration={call.duration} />
            </CardContent>
          </ThemeCard>
        </TabsContent>
      </Tabs>
    </ThemedDialogContent>
  );
}
