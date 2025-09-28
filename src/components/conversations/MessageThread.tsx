import React, { useState, useEffect, useRef } from "react";
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
  messageFilter: 'all' | 'calls' | 'sms';
  onMessageFilterChange: (filter: 'all' | 'calls' | 'sms') => void;
}

export function MessageThread({ conversation, messageFilter, onMessageFilterChange }: MessageThreadProps) {
  const [showTranscription, setShowTranscription] = useState(false);
  
  // Debug: Log when conversation prop changes
  useEffect(() => {
    console.log('📱 MessageThread received conversation update:', {
      conversationId: conversation.id,
      phoneNumber: conversation.phoneNumber,
      totalSMS: conversation.totalSMS,
      totalCalls: conversation.totalCalls,
      smsMessagesCount: conversation.smsMessages?.length || 0,
      callsCount: conversation.calls?.length || 0,
      lastActivity: conversation.lastActivityTimestamp?.toISOString()
    });
  }, [conversation]);
  const [liveTranscription, setLiveTranscription] = useState<TranscriptionSegment[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loadingAssistants, setLoadingAssistants] = useState(false);
  const [phoneMappings, setPhoneMappings] = useState<PhoneNumberMapping[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [shouldPreserveScroll, setShouldPreserveScroll] = useState(false);
  const lastScrollPositionRef = useRef(0);
  const wasAtBottomRef = useRef(false);

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

  // Debug message filter changes - moved after allMessages declaration

  // Preserve scroll position when conversation data updates
  useEffect(() => {
    if (shouldPreserveScroll && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollPosition;
          setShouldPreserveScroll(false);
          console.log('📱 Restored scroll position to:', scrollPosition);
        }, 100);
      }
    }
  }, [conversation, shouldPreserveScroll, scrollPosition]);

  // Check if user is near bottom of scroll area
  const isNearBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        return scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
      }
    }
    return false;
  };

  // Auto-scroll to bottom for new messages if user is near bottom
  useEffect(() => {
    if (conversation.smsMessages && conversation.smsMessages.length > 0) {
      // Use a timeout to ensure the DOM has updated
      setTimeout(() => {
        console.log('📱 Scroll handling for new messages:', {
          smsCount: conversation.smsMessages.length,
          wasAtBottom: wasAtBottomRef.current,
          lastScrollPosition: lastScrollPositionRef.current
        });
        
        if (wasAtBottomRef.current && scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
            console.log('📱 Auto-scrolled to bottom for new messages');
          }
        } else if (!wasAtBottomRef.current && lastScrollPositionRef.current > 0) {
          // Restore previous scroll position
          const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTop = lastScrollPositionRef.current;
            console.log('📱 Restored scroll position to:', lastScrollPositionRef.current);
          }
        }
      }, 200); // Increased timeout to ensure DOM is ready
    }
  }, [conversation.smsMessages?.length, conversation.calls?.length]);

  // Helper function to scroll to bottom
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        console.log('📱 Scrolled to bottom');
        
        // Update scroll tracking state
        wasAtBottomRef.current = true;
        lastScrollPositionRef.current = scrollContainer.scrollHeight;
      }
    }
  };

  // Auto-scroll to bottom when conversation changes (new conversation selected)
  useEffect(() => {
    // Use a timeout to ensure the DOM has updated with new messages
    setTimeout(() => {
      scrollToBottom();
      console.log('📱 Auto-scrolled to bottom for new conversation selection');
    }, 300); // Slightly longer timeout to ensure all messages are rendered
  }, [conversation.id]); // Trigger when conversation ID changes

  // Auto-scroll to bottom when message filter changes (to show latest messages)
  useEffect(() => {
    // Use a timeout to ensure the DOM has updated with filtered messages
    setTimeout(() => {
      scrollToBottom();
      console.log('📱 Auto-scrolled to bottom for message filter change');
    }, 200);
  }, [messageFilter, selectedAgentId]); // Trigger when filter changes

  // Save scroll position when user scrolls
  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const currentScrollTop = scrollContainer.scrollTop;
        const { scrollHeight, clientHeight } = scrollContainer;
        const isAtBottom = scrollHeight - currentScrollTop - clientHeight < 100;
        
        setScrollPosition(currentScrollTop);
        lastScrollPositionRef.current = currentScrollTop;
        wasAtBottomRef.current = isAtBottom;
        
        console.log('📱 Scroll position updated:', {
          scrollTop: currentScrollTop,
          isAtBottom,
          scrollHeight,
          clientHeight
        });
      }
    }
  };

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
    type: 'call' as const,
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

  // Filter messages by selected agent and message type
  const filteredMessages = messages.filter(message => {
    // First filter by message type
    if (messageFilter === 'calls' && message.type !== 'call') {
      return false;
    }
    if (messageFilter === 'sms' && message.type !== 'sms') {
      return false;
    }

    // Then filter by selected agent if one is selected
    if (selectedAgentId !== "all") {
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
    }

    return true;
  });

  // Combine and sort all messages by created_at timestamp (WhatsApp style - newest at bottom)
  const allMessages = [...filteredMessages, ...liveTranscriptionMessages]
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Debug message filter changes
  useEffect(() => {
    console.log('📱 Message filtering debug:', {
      totalMessages: messages.length,
      filteredMessages: filteredMessages.length,
      allMessages: allMessages.length,
      messageFilter,
      selectedAgentId,
      smsMessages: messages.filter(m => m.type === 'sms').length,
      callMessages: messages.filter(m => m.type === 'call').length,
      filteredSMS: filteredMessages.filter(m => m.type === 'sms').length,
      filteredCalls: filteredMessages.filter(m => m.type === 'call').length,
      conversationSMS: conversation.smsMessages?.length || 0,
      conversationCalls: conversation.calls?.length || 0
    });
  }, [messageFilter, allMessages.length, messages.length, filteredMessages.length, conversation.smsMessages?.length, conversation.calls?.length]);

  // Debug button rendering
  useEffect(() => {
    console.log('MessageThread rendered with conversation:', {
      totalCalls: conversation.totalCalls,
      totalSMS: conversation.totalSMS,
      messageFilter
    });
  }, [conversation.totalCalls, conversation.totalSMS, messageFilter]);

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
    <div
      className="h-full flex flex-col"
      onClick={(e) => {
        console.log('MessageThread container clicked', e.target);
      }}
    >

      {/* Thread Header */}
      <div
        className="p-3 border-b border-border/50"
        onClick={(e) => {
          console.log('Header clicked', e.target);
        }}
      >
        <div
          className="flex items-center justify-between"
          onClick={(e) => {
            console.log('Header content clicked', e.target);
          }}
        >
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
            <div className="flex items-center space-x-2 relative">
              
          
              {messageFilter !== 'all' && (
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border-2 px-2.5 py-0.5 text-[11px] font-semibold transition-all duration-200 cursor-pointer hover:scale-105 select-none active:scale-95 z-10 relative border-gray-300 bg-secondary text-secondary-foreground hover:bg-blue-50 hover:border-blue-400 hover:shadow-sm"
                  onClick={() => {
                    console.log('Show All clicked');
                    onMessageFilterChange('all');
                  }}
                  style={{ pointerEvents: 'auto' }}
                >
                  Show All
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Select
              value={selectedAgentId}
              onValueChange={setSelectedAgentId}
            >
              <SelectTrigger className="w-48 h-8 text-xs bg-gray-800/90 border-gray-700/60 text-white hover:bg-gray-700/90 hover:border-gray-600/80">
                <div className="flex items-center space-x-2">
                  <Users className="w-3 h-3 text-gray-300" />
                  <SelectValue placeholder="Filter by Agent" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-gray-800/95 border-gray-700/60 backdrop-blur-sm">
                <SelectItem value="all" className="text-white hover:bg-gray-700/50">All Agents</SelectItem>
                {assistants.map((assistant) => (
                  <SelectItem key={assistant.id} value={assistant.id} className="text-white hover:bg-gray-700/50">
                    {assistant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter status indicator */}
            {messageFilter !== 'all' && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <div className="w-1 h-1 bg-primary rounded-full"></div>
                <span>
                  {messageFilter === 'calls' ? 'Calls only' : 'SMS only'}
                </span>
              </div>
            )}

           
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

        <ScrollArea
          ref={scrollAreaRef}
          className="flex-1"
          onScrollCapture={handleScroll}
        >
          {/* Message count indicator */}
          {messageFilter !== 'all' && (
            <div className="px-3 pt-2 pb-1">
              <div className="text-xs text-muted-foreground">
                Showing {allMessages.length} {messageFilter === 'calls' ? 'call' : 'SMS'} message{allMessages.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

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
            selectedAgentPhoneNumber={getPhoneNumberForSelectedAgent()}
            isDisabled={selectedAgentId === "all"}
          />
        </div>
      </div>
    </div>
  );
}