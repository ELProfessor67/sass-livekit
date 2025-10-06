import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, MessageSquare, Phone } from "lucide-react";
import { Conversation } from "./types";
import { normalizeResolution } from "@/components/dashboard/call-outcomes/utils";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from "@/utils/formatUtils";

interface ConversationsListProps {
  conversations: Conversation[];
  selectedConversationId?: string;
  onSelectConversation: (conversation: Conversation) => void;
}

export function ConversationsList({
  conversations,
  selectedConversationId,
  onSelectConversation
}: ConversationsListProps) {

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get display name based on whether we have structured name or not
  const getDisplayName = (conversation: Conversation): string => {
    // First, check if conversation already has a displayName (from ContactSummary)
    if (conversation.displayName && conversation.displayName !== formatPhoneNumber(conversation.phoneNumber)) {
      // If displayName contains both name and phone (format: "Name - Phone"), extract just the name
      if (conversation.displayName.includes(' - ')) {
        return conversation.displayName.split(' - ')[0];
      }
      // If it's just the name, return it
      return conversation.displayName;
    }

    // Check if conversation has calls with structured data
    if (conversation.calls && conversation.calls.length > 0) {
      // Sort calls by date to get the most recent one
      const sortedCalls = [...conversation.calls].sort((a, b) => 
        new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()
      );
      
      const latestCall = sortedCalls[0];
      
      // Check if the call has structured_data (analysis results)
      let structuredData = null;
      if (latestCall.analysis && typeof latestCall.analysis === 'object') {
        structuredData = latestCall.analysis;
      } else if ((latestCall as any).structured_data && typeof (latestCall as any).structured_data === 'object') {
        structuredData = (latestCall as any).structured_data;
      }

      if (structuredData) {
        // Helper function to extract value from structured data field
        const extractValue = (field: any): string | undefined => {
          if (typeof field === 'string') {
            return field;
          } else if (field && typeof field === 'object' && field.value) {
            return field.value;
          }
          return undefined;
        };

        // Try to find customer name in structured data
        const customerNameField = structuredData['Customer Name'] || structuredData['name'] || structuredData['full_name'] || structuredData['contact_name'] || structuredData['client_name'];
        if (customerNameField) {
          const extractedName = extractValue(customerNameField);
          if (extractedName && extractedName.trim() !== '') {
            return extractedName; // Only name, no phone number
          }
        }
      }
    }
    
    // Fallback to formatted phone number if no name found
    return formatPhoneNumber(conversation.phoneNumber);
  };

  // Check if we have a contact name for this conversation
  const hasContactName = (conversation: Conversation): boolean => {
    // First, check if conversation already has a displayName (from ContactSummary)
    if (conversation.displayName && conversation.displayName !== formatPhoneNumber(conversation.phoneNumber)) {
      // If displayName contains both name and phone (format: "Name - Phone"), we have a name
      if (conversation.displayName.includes(' - ')) {
        return true;
      }
      // If it's just the name (not a phone number), we have a name
      return conversation.displayName !== formatPhoneNumber(conversation.phoneNumber);
    }

    if (conversation.calls && conversation.calls.length > 0) {
      const sortedCalls = [...conversation.calls].sort((a, b) => 
        new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()
      );
      
      const latestCall = sortedCalls[0];
      
      let structuredData = null;
      if (latestCall.analysis && typeof latestCall.analysis === 'object') {
        structuredData = latestCall.analysis;
      } else if ((latestCall as any).structured_data && typeof (latestCall as any).structured_data === 'object') {
        structuredData = (latestCall as any).structured_data;
      }

      if (structuredData) {
        const extractValue = (field: any): string | undefined => {
          if (typeof field === 'string') {
            return field;
          } else if (field && typeof field === 'object' && field.value) {
            return field.value;
          }
          return undefined;
        };

        const customerNameField = structuredData['Customer Name'] || structuredData['name'] || structuredData['full_name'] || structuredData['contact_name'] || structuredData['client_name'];
        if (customerNameField) {
          const extractedName = extractValue(customerNameField);
          return extractedName && extractedName.trim() !== '';
        }
      }
    }
    return false;
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

  // Get channel icon and style for the most recent message (UI enhancement)
  const getChannelIndicator = (conversation: Conversation) => {
    // Use mock data for UI enhancement - determine channel based on phone number or random
    const phoneNumber = conversation.phoneNumber;
    const lastDigit = parseInt(phoneNumber.slice(-1));
    
    // Mock channel assignment based on phone number for UI variety
    let channel: 'sms' | 'whatsapp' | 'imessage' = 'sms';
    if (lastDigit % 3 === 0) channel = 'whatsapp';
    else if (lastDigit % 3 === 1) channel = 'imessage';
    
    switch (channel) {
      case 'whatsapp':
        return <MessageSquare className="w-3 h-3 text-green-500" />;
      case 'imessage':
        return <MessageSquare className="w-3 h-3 text-blue-500" />;
      case 'sms':
      default:
        return <MessageSquare className="w-3 h-3 text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-[var(--space-lg)] border-b border-white/[0.08]">
        {/* Conversation Count */}
        <div className="text-[11px] text-muted-foreground">
          {conversations.length} conversations
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-[var(--space-md)]">
          {conversations.map((conversation, index) => (
            <React.Fragment key={conversation.id}>
              <div
                onClick={() => onSelectConversation(conversation)}
                className={cn(
                  "p-3 rounded-[var(--radius-md)] cursor-pointer transition-all duration-200 border",
                  selectedConversationId === conversation.id 
                    ? "bg-accent/80 text-accent-foreground border-accent/30" 
                    : "hover:bg-muted/30 border-transparent hover:border-border/20",
                  conversation.hasNewMessages && selectedConversationId !== conversation.id && "bg-blue-50/10 border-blue-200/20"
                )}
              >
                <div className="flex items-start gap-1">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-[10px] font-medium bg-muted text-muted-foreground">
                      {getInitials(getDisplayName(conversation))}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1.5">
                        {getChannelIndicator(conversation)}
                        <h3 className="text-sm font-medium text-foreground truncate">
                          {getDisplayName(conversation)}
                        </h3>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {conversation.lastActivityTime}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {/* New message indicators */}
                        {conversation.hasNewSMS && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="New SMS message" />
                        )}
                        {conversation.hasNewCalls && (
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="New call activity" />
                        )}
                        
                        {/* Call outcome indicator */}
                        {conversation.lastCallOutcome && (
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full ml-2",
                            getOutcomeBadgeColor(conversation.lastCallOutcome) === 'default' && "bg-green-500",
                            getOutcomeBadgeColor(conversation.lastCallOutcome) === 'secondary' && "bg-blue-500",
                            getOutcomeBadgeColor(conversation.lastCallOutcome) === 'destructive' && "bg-red-500",
                            getOutcomeBadgeColor(conversation.lastCallOutcome) === 'outline' && "bg-gray-400"
                          )} />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {conversation.totalCalls} calls • {conversation.totalDuration}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Add separator between items (not after the last one) */}
              {index < conversations.length - 1 && (
                <div className="my-2 px-3">
                  <Separator className="bg-border/60 dark:bg-white/[0.08]" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        
        {conversations.length === 0 && (
          <div className="p-[var(--space-xl)] text-center text-muted-foreground">
            <div className="text-sm font-medium mb-1">No conversations found</div>
            <p className="text-xs">Try adjusting your filters</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}