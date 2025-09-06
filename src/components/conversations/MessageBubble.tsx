import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, Clock, Download } from "lucide-react";
import { format } from "date-fns";
import { Conversation } from "./types";
import { normalizeResolution } from "@/components/dashboard/call-outcomes/utils";
import { CompactAudioPlayer } from "@/components/ui/compact-audio-player";
import { InlineTranscriptView } from "./InlineTranscriptView";

interface MessageBubbleProps {
  message: {
    id: string;
    type: 'call' | 'transcription';
    timestamp: Date;
    direction: string;
    duration: string;
    status: string;
    resolution?: string;
    summary?: string;
    recording?: string;
    transcript?: any;
    date: string;
    time: string;
    isLive?: boolean;
    confidence?: number;
  };
  conversation: Conversation;
  showAvatar?: boolean;
}

export function MessageBubble({ message, conversation, showAvatar = true }: MessageBubbleProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getOutcomeBadgeColor = (outcome?: string) => {
    if (!outcome) return "secondary";
    const normalized = normalizeResolution(outcome).toLowerCase();
    
    if (normalized.includes('appointment') || normalized.includes('booked')) {
      return "default";
    } else if (normalized.includes('qualified') && !normalized.includes('not')) {
      return "secondary";
    } else if (normalized.includes('spam')) {
      return "destructive";
    } else if (normalized.includes('not qualified') || normalized.includes('not eligible')) {
      return "outline";
    }
    return "secondary";
  };

  const isIncoming = message.direction === 'inbound';
  const isLiveTranscription = message.type === 'transcription' && message.isLive;

  return (
    <div className={`flex ${isIncoming ? 'justify-start' : 'justify-end'} space-x-2`}>
      {isIncoming && showAvatar && (
        <Avatar className="h-6 w-6 bg-primary/10 flex-shrink-0">
          <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-medium">
            {getInitials(conversation.displayName)}
          </AvatarFallback>
        </Avatar>
      )}
      {isIncoming && !showAvatar && (
        <div className="w-6" />
      )}

      <div className={`max-w-sm ${!isIncoming ? 'ml-auto' : ''}`}>
        <div
          className={`px-3 py-2 rounded-xl transition-all duration-200 ${
            isLiveTranscription
              ? 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
              : isIncoming
              ? 'bg-card/50 border border-border/50'
              : 'bg-primary/10 border border-primary/20'
          }`}
        >
          {/* Call Header */}
          <div className="flex items-center space-x-2 mb-1">
            {message.type === 'transcription' ? (
              <>
                <Mic className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Live Transcription
                </span>
                {isLiveTranscription && (
                  <Badge variant="secondary" className="text-[10px] ml-auto px-1.5 py-0 animate-pulse">
                    Live
                  </Badge>
                )}
              </>
            ) : (
              <>
                <Phone className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  {isIncoming ? 'Incoming' : 'Outgoing'} Call
                </span>
                <Badge 
                  variant={getOutcomeBadgeColor(message.resolution)}
                  className="text-[10px] ml-auto px-1.5 py-0"
                >
                  {normalizeResolution(message.resolution || 'Unknown')}
                </Badge>
              </>
            )}
          </div>

          {/* Call Details */}
          <div className="flex items-center space-x-2 text-[11px] text-muted-foreground mb-2">
            {message.type === 'transcription' ? (
              <>
                <div className="flex items-center space-x-1">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{message.time}</span>
                </div>
                {message.confidence && (
                  <>
                    <span>•</span>
                    <span>Confidence: {Math.round(message.confidence * 100)}%</span>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center space-x-1">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{message.duration}</span>
                </div>
                <span>•</span>
                <span>{message.status}</span>
              </>
            )}
          </div>

          {/* Summary */}
          {message.summary && (
            <p className="text-xs text-foreground mb-2 leading-relaxed">
              {message.summary}
            </p>
          )}

          {/* Live Transcription Text */}
          {message.type === 'transcription' && message.transcript && (
            <div className="text-xs text-foreground mb-2 leading-relaxed">
              {message.transcript.map((entry: any, idx: number) => (
                <div key={idx} className="mb-1">
                  <span className="font-medium text-foreground">
                    {entry.speaker}:
                  </span>
                  <span className="text-muted-foreground ml-1">
                    {entry.text}
                    {isLiveTranscription && idx === message.transcript.length - 1 && (
                      <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Recording */}
          {message.recording && (
            <div className="mt-2">
              <CompactAudioPlayer
                src={message.recording}
                title={`Call with ${conversation.displayName}`}
              />
            </div>
          )}

          {/* Transcript */}
          {message.transcript && (
            <div className="mt-2">
              <InlineTranscriptView transcript={message.transcript} />
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-[10px] text-muted-foreground mt-1 ${!isIncoming ? 'text-right' : ''}`}>
          {format(message.timestamp, 'h:mm a')}
        </div>
      </div>

      {!isIncoming && showAvatar && (
        <Avatar className="h-6 w-6 bg-primary/20 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-medium">
            ME
          </AvatarFallback>
        </Avatar>
      )}
      {!isIncoming && !showAvatar && (
        <div className="w-6" />
      )}
    </div>
  );
}