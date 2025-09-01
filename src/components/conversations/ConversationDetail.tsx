import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Clock, Calendar, MessageSquare } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Conversation } from "./types";
import { Call } from "@/components/calls/types";
import { normalizeResolution } from "@/components/dashboard/call-outcomes/utils";
import { CompactAudioPlayer } from "@/components/ui/compact-audio-player";

interface ConversationDetailProps {
  conversation: Conversation;
}

export function ConversationDetail({ conversation }: ConversationDetailProps) {
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
      return "default"; // Green
    } else if (normalized.includes('qualified') && !normalized.includes('not')) {
      return "secondary"; // Blue
    } else if (normalized.includes('spam')) {
      return "destructive"; // Red
    } else if (normalized.includes('not qualified') || normalized.includes('not eligible')) {
      return "outline"; // Gray
    }
    return "secondary";
  };

  const CallTimelineItem = ({ call, index }: { call: Call; index: number }) => (
    <div className="flex space-x-4 pb-6">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
          <Phone className="w-4 h-4 text-primary" />
        </div>
        {index < conversation.calls.length - 1 && (
          <div className="w-px h-full bg-border mt-2" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <Card className="liquid-glass-light border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={getOutcomeBadgeColor(call.resolution)}
                  className="text-xs"
                >
                  {normalizeResolution(call.resolution || 'Unknown')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {call.direction}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(`${call.date}T${call.time}`), 'MMM d, yyyy')} at {call.time}
              </span>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="flex items-center space-x-4 mb-3 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{call.duration}</span>
              </div>
              <span>•</span>
              <span>{call.status}</span>
            </div>
            
            {call.summary && (
              <p className="text-sm text-foreground mb-3">
                {call.summary}
              </p>
            )}
            
            {call.call_recording && (
              <div className="mt-3">
                <CompactAudioPlayer
                  src={call.call_recording}
                  title={`Call with ${conversation.displayName}`}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Contact Profile Header */}
      <div className="p-6 border-b border-border/50 liquid-glass-light">
        <div className="flex items-start space-x-4">
          <Avatar className="h-16 w-16 bg-primary/10">
            <AvatarFallback className="bg-primary/20 text-primary font-medium text-xl">
              {getInitials(conversation.displayName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              {conversation.displayName}
            </h1>
            <p className="text-lg text-muted-foreground mb-3">
              {conversation.phoneNumber}
            </p>
            
            <div className="flex items-center space-x-4 mb-4">
              <Button size="sm" className="gap-2">
                <Phone className="w-4 h-4" />
                Call
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Message
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <Calendar className="w-4 h-4" />
                Schedule
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Total Calls</div>
                <div className="font-medium text-foreground">{conversation.totalCalls}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Duration</div>
                <div className="font-medium text-foreground">{conversation.totalDuration}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Appointments</div>
                <div className="font-medium text-foreground">{conversation.outcomes.appointments}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Last Contact</div>
                <div className="font-medium text-foreground">
                  {formatDistanceToNow(conversation.lastActivityTimestamp, { addSuffix: true })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Interaction Timeline */}
      <div className="flex-1">
        <ScrollArea className="h-full">
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Interaction Timeline
              </h2>
              <Badge variant="outline" className="text-xs">
                {conversation.calls.length} interaction{conversation.calls.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="space-y-0">
              {conversation.calls.map((call, index) => (
                <CallTimelineItem key={call.id} call={call} index={index} />
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}