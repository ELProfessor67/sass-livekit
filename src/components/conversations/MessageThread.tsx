import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Clock, Mic, MicOff, MessageSquare, Users } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { Conversation } from "./types";
import { MessageBubble } from "./MessageBubble";
import { ModernMessageInput } from "./ModernMessageInput";
import { RealTimeTranscription } from "./RealTimeTranscription";
import { normalizeResolution } from "@/components/dashboard/call-outcomes/utils";
import { TranscriptionSegment } from "@/lib/transcription/RealTimeTranscriptionService";
import { SMSMessage } from "@/lib/api/sms/smsService";
import { fetchAssistants, Assistant } from "@/lib/api/assistants/fetchAssistants";
import { fetchPhoneNumberMappings, PhoneNumberMapping } from "@/lib/api/phoneNumbers/fetchPhoneNumberMappings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MessageThreadProps {
  conversation: Conversation;
}

export function MessageThread({ conversation }: MessageThreadProps) {
  const [showTranscription, setShowTranscription] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState<TranscriptionSegment[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loadingAssistants, setLoadingAssistants] = useState(false);
  const [phoneMappings, setPhoneMappings] = useState<PhoneNumberMapping[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");

  // Load assistants and phone mappings on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoadingAssistants(true);
      try {
        const [assistantsResponse, phoneMappingsResponse] = await Promise.all([
          fetchAssistants(),
          fetchPhoneNumberMappings()
        ]);
        setAssistants(assistantsResponse.assistants);
        setPhoneMappings(phoneMappingsResponse.mappings);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingAssistants(false);
      }
    };

    loadData();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper function to get assistant ID for a phone number
  const getAssistantIdForPhoneNumber = (phoneNumber: string): string | null => {
    const mapping = phoneMappings.find(m => m.number === phoneNumber);
    return mapping?.inbound_assistant_id || null;
  };

  // Helper function to get phone number for selected agent
  const getPhoneNumberForSelectedAgent = (): string | null => {
    if (selectedAgentId === "all" || !selectedAgentId) {
      return null; // Use default phone number selection
    }
    
    const mapping = phoneMappings.find(m => m.inbound_assistant_id === selectedAgentId);
    return mapping?.number || null;
  };

  // Convert calls to messages with proper grouping using created_at timestamp
  const callMessages = conversation.calls.map(call => ({
    id: call.id,
    type: 'call' as const,
    timestamp: new Date(call.created_at || `${call.date}T${call.time}`),
    direction: call.direction,
    duration: call.duration,
    status: call.status,
    resolution: call.resolution,
    summary: call.summary,
    recording: call.call_recording,
    transcript: call.transcript,
    date: call.date,
    time: call.time
  }));

  // Convert SMS messages to message format using created_at timestamp
  const smsMessages = (conversation.smsMessages || []).map(sms => ({
    id: sms.messageSid,
    type: 'sms' as const,
    timestamp: new Date(sms.dateCreated), // dateCreated is the created_at timestamp
    direction: sms.direction,
    duration: '0:00',
    status: sms.status,
    resolution: undefined,
    summary: undefined,
    recording: undefined,
    transcript: [{
      speaker: sms.direction === 'inbound' ? 'Customer' : 'Agent',
      time: format(new Date(sms.dateCreated), 'HH:mm'),
      text: sms.body
    }],
    date: format(new Date(sms.dateCreated), 'yyyy-MM-dd'),
    time: format(new Date(sms.dateCreated), 'HH:mm'),
    smsData: sms
  }));

  // Combine and sort all messages by created_at timestamp (WhatsApp style - newest at bottom)
  const messages = [...callMessages, ...smsMessages]
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());


  // Add live transcription segments as messages
  const liveTranscriptionMessages = liveTranscription.map(segment => ({
    id: `live_${segment.id}`,
    type: 'transcription' as const,
    timestamp: new Date(segment.timestamp),
    direction: segment.speaker === 'customer' ? 'inbound' : 'outbound',
    duration: '0:00',
    status: segment.isFinal ? 'completed' : 'live',
    resolution: undefined,
    summary: undefined,
    recording: undefined,
    transcript: [{
      speaker: segment.speaker === 'customer' ? 'Customer' : segment.speaker === 'agent' ? 'Agent' : 'System',
      time: format(new Date(segment.timestamp), 'HH:mm'),
      text: segment.text
    }],
    date: format(new Date(segment.timestamp), 'yyyy-MM-dd'),
    time: format(new Date(segment.timestamp), 'HH:mm'),
    isLive: !segment.isFinal,
    confidence: segment.confidence
  }));

  // Filter messages by selected agent if one is selected
  const filteredMessages = selectedAgentId !== "all"
    ? messages.filter(message => {
        // For call messages, check if the call was handled by the selected agent
        if (message.type === 'call') {
          const call = conversation.calls.find(c => c.id === message.id);
          return call?.assistant_id === selectedAgentId;
        }
        // For SMS messages, check if the phone number is mapped to the selected agent
        if (message.type === 'sms' && message.smsData) {
          const sms = message.smsData;
          // Check both from and to phone numbers for assistant mapping
          const fromAssistantId = getAssistantIdForPhoneNumber(sms.from);
          const toAssistantId = getAssistantIdForPhoneNumber(sms.to);
          
          // Include SMS if either the sender or recipient phone number is mapped to the selected agent
          return fromAssistantId === selectedAgentId || toAssistantId === selectedAgentId;
        }
        return false;
      })
    : messages;

  // Combine and sort all messages by created_at timestamp (WhatsApp style - newest at bottom)
  const allMessages = [...filteredMessages, ...liveTranscriptionMessages]
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Group messages by date
  const groupedMessages = allMessages.reduce((groups, message) => {
    const dateKey = format(message.timestamp, 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, typeof allMessages>);

  // Sort date groups in ascending order (WhatsApp style - oldest dates first, newest at bottom)
  const sortedDateGroups = Object.entries(groupedMessages)
    .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());

  return (
    <div className="h-full flex flex-col">
      {/* Thread Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between">
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
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-[11px]">
                {conversation.totalCalls} call{conversation.totalCalls !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                {conversation.totalSMS || 0} SMS
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select
              value={selectedAgentId}
              onValueChange={setSelectedAgentId}
            >
              <SelectTrigger className="w-48 h-8 text-xs">
                <div className="flex items-center space-x-2">
                  <Users className="w-3 h-3" />
                  <SelectValue placeholder="Filter by Agent" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {assistants.map((assistant) => (
                  <SelectItem key={assistant.id} value={assistant.id}>
                    {assistant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant={showTranscription ? "default" : "outline"}
              size="sm"
              onClick={() => setShowTranscription(!showTranscription)}
            >
              {showTranscription ? (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Hide Live
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Live Transcribe
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {showTranscription && (
          <div className="border-b border-border/50">
            <RealTimeTranscription
              conversationId={conversation.id}
              onTranscriptionUpdate={setLiveTranscription}
              className="p-4"
            />
          </div>
        )}
        
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {sortedDateGroups.map(([dateKey, dayMessages]) => (
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
          <ModernMessageInput 
            conversation={conversation} 
            selectedAgentPhoneNumber={getPhoneNumberForSelectedAgent() || undefined}
            isDisabled={selectedAgentId === "all"}
          />
        </div>
      </div>
    </div>
  );
}