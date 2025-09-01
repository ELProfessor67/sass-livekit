import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, Clock } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { Conversation } from "./types";
import { MessageBubble } from "./MessageBubble";
import { ModernMessageInput } from "./ModernMessageInput";
import { normalizeResolution } from "@/components/dashboard/call-outcomes/utils";

interface MessageThreadProps {
  conversation: Conversation;
}

export function MessageThread({ conversation }: MessageThreadProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Convert calls to messages with proper grouping
  const messages = conversation.calls.map(call => ({
    id: call.id,
    type: 'call' as const,
    timestamp: new Date(`${call.date}T${call.time}`),
    direction: call.direction,
    duration: call.duration,
    status: call.status,
    resolution: call.resolution,
    summary: call.summary,
    recording: call.call_recording,
    transcript: call.transcript,
    date: call.date,
    time: call.time
  })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const dateKey = format(message.timestamp, 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, typeof messages>);

  return (
    <div className="h-full flex flex-col">
      {/* Thread Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8 bg-primary/10">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
              {getInitials(conversation.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-base font-medium text-foreground">
              {conversation.displayName}
            </h2>
            <p className="text-xs text-muted-foreground">
              {conversation.phoneNumber}
            </p>
          </div>
          <Badge variant="outline" className="text-[11px]">
            {conversation.totalCalls} call{conversation.totalCalls !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
              <div key={dateKey} className="space-y-2">
                {/* Date Separator */}
                <div className="flex items-center justify-center">
                  <div className="px-2 py-0.5 bg-muted/50 rounded-full text-[11px] text-muted-foreground">
                    {format(new Date(dateKey), 'MMM d, yyyy')}
                  </div>
                </div>

                {/* Messages for this day */}
                {dayMessages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    conversation={conversation}
                    showAvatar={index === 0 || dayMessages[index - 1]?.direction !== message.direction}
                  />
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t border-border/50">
          <ModernMessageInput conversation={conversation} />
        </div>
      </div>
    </div>
  );
}