import { Download, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SectionHeading, BodyText, SecondaryText } from "@/components/ui/typography";
import { RecordingPlayer } from "@/components/dashboard/calls/RecordingPlayer";
import { Call, TranscriptEntry } from "../types";
import { MessagesView } from "./MessagesView";
import { formatSummaryForDisplay } from "@/utils/summaryUtils";

interface CallContentTabsProps {
  callData: Call;
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function CallContentTabs({
  callData,
  activeTab,
  onTabChange
}: CallContentTabsProps) {
  const { toast } = useToast();
  
  const hasRecording = callData.call_recording && typeof callData.call_recording === 'string';
  
  const handleDownload = () => {
    toast({
      title: "Recording downloaded",
      description: "Call recording has been downloaded successfully"
    });
  };
  
  const parsedTranscript = parseTranscript(callData.transcript);
  
  return (
    <Tabs defaultValue="overview" value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 md:w-[500px]">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="transcript">Transcript</TabsTrigger>
        <TabsTrigger value="recording">Recording</TabsTrigger>
        <TabsTrigger value="messages" className="flex items-center gap-2">
          <MessageSquare size={14} strokeWidth={1.5} />
          Messages
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="mt-6">
        <Card>
          <CardHeader>
            <SectionHeading>Call Summary</SectionHeading>
            <SecondaryText className="mt-2">
              AI-generated summary of the call conversation.
            </SecondaryText>
          </CardHeader>
          <CardContent>
            <BodyText>{formatSummaryForDisplay(callData.summary)}</BodyText>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="transcript" className="mt-6">
        <Card>
          <CardHeader>
            <SectionHeading>Call Transcript</SectionHeading>
            <SecondaryText className="mt-2">
              Full transcript of the conversation.
            </SecondaryText>
          </CardHeader>
          <CardContent>
            <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-6">
              {parsedTranscript.length > 0 ? parsedTranscript.map((entry, index) => <div key={index} className={`flex ${entry.speaker === "Agent" || entry.speaker === "AI" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] p-4 rounded-lg shadow-sm ${entry.speaker === "Agent" || entry.speaker === "AI" ? "transcript-message-agent" : "transcript-message-user"}`}>
                    <div className="flex justify-between mb-2 items-center">
                      <span className="font-semibold text-sm">{entry.speaker === "AI" ? "Agent" : entry.speaker}</span>
                      <span className="text-xs text-muted-foreground">{entry.time || ""}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{entry.text}</p>
                  </div>
                </div>) : <BodyText className="text-muted-foreground">No transcript available for this call.</BodyText>}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="recording" className="mt-6">
        <Card>
          <CardHeader>
            <SectionHeading>Call Recording</SectionHeading>
            <SecondaryText className="mt-2">
              Audio recording of the conversation.
            </SecondaryText>
          </CardHeader>
          <CardContent>
            {hasRecording ? (
              <div className="flex flex-col items-center space-y-6">
                <RecordingPlayer 
                  recording={callData.call_recording} 
                  duration={callData.duration}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg">
                <BodyText className="text-muted-foreground">No recording available for this call.</BodyText>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="messages" className="mt-6">
        <Card>
          <CardHeader>
            <SectionHeading>Messages</SectionHeading>
            <SecondaryText className="mt-2">
              Text messages exchanged during this interaction.
            </SecondaryText>
          </CardHeader>
          <CardContent>
            <MessagesView messages={callData.messages} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function parseTranscript(transcript: any): TranscriptEntry[] {
  if (!transcript) return [];
  if (Array.isArray(transcript)) {
    return transcript;
  }
  if (typeof transcript === 'object' && transcript.transcript && Array.isArray(transcript.transcript)) {
    return transcript.transcript;
  }
  if (typeof transcript === 'string') {
    try {
      const parsed = JSON.parse(transcript);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}
