import React from "react";
import { Badge } from "@/components/ui/badge";
import { CompactAudioPlayer } from "@/components/ui/compact-audio-player";
import { useRecording } from "@/hooks/useRecording";
import { RecordingLoader } from "./RecordingLoader";

interface CallRecordingDisplayProps {
  call: {
    call_sid?: string;
    call_recording?: string;
    recording_info?: any;
  };
  conversationName: string;
}

export function CallRecordingDisplay({ call, conversationName }: CallRecordingDisplayProps) {
  const { recording, loading, error, hasRecording } = useRecording(call.call_sid);

  // Show loading state
  if (loading && call.call_sid) {
    return <RecordingLoader callSid={call.call_sid} />;
  }

  // Show error state
  if (error) {
    return (
      <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
        <div className="text-sm text-destructive">
          Failed to load recording: {error}
        </div>
      </div>
    );
  }

  // Show recording info if available
  if (recording && hasRecording) {
    return (
      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-foreground">Recording Details</h4>
          <Badge variant="outline" className="text-xs">
            {recording.recordingStatus}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>Duration: {Math.floor(recording.recordingDuration / 60)}:{(recording.recordingDuration % 60).toString().padStart(2, '0')}</div>
          <div>Channels: {recording.recordingChannels}</div>
          <div>Source: {recording.recordingSource}</div>
          <div>Track: {recording.recordingTrack}</div>
        </div>
        <div className="mt-2">
          <CompactAudioPlayer
            src={recording.recordingUrl}
            title={`Recording - Call with ${conversationName}`}
          />
        </div>
      </div>
    );
  }

  // Show legacy recording if available
  if (call.call_recording) {
    return (
      <div className="mt-3">
        <CompactAudioPlayer
          src={call.call_recording}
          title={`Call with ${conversationName}`}
        />
      </div>
    );
  }

  // No recording available
  return null;
}

