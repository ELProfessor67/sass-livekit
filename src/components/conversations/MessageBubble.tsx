import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Phone, Clock, MessageSquare, Check, CheckCheck, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Conversation } from "./types";
import { normalizeResolution } from "@/components/dashboard/call-outcomes/utils";
import { CompactAudioPlayer } from "@/components/ui/compact-audio-player";
import { InlineTranscriptView } from "./InlineTranscriptView";
import { SummaryExpandDialog } from "./SummaryExpandDialog";
import { SMSMessage } from "@/lib/api/sms/smsService";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ExternalLink } from "lucide-react";
import { formatSummaryForDisplay } from "@/utils/summaryUtils";

interface MessageBubbleProps {
  message: {
    id: string;
    type: 'call' | 'sms' | 'whatsapp' | 'imessage';
    timestamp: Date;
    direction: string;
    duration?: string;
    status?: string;
    resolution?: string;
    summary?: string;
    recording?: string;
    transcript?: any;
    date: string;
    time: string;
    isLive?: boolean;
    confidence?: number;
    smsData?: SMSMessage;
    channel?: 'sms' | 'whatsapp' | 'imessage';
    body?: string;
    deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    effects?: string;
    reactions?: string[];
  };
  conversation: Conversation;
  showAvatar?: boolean;
  onRetryMessage?: (messageId: string) => Promise<void>;
}

export function MessageBubble({ message, conversation, showAvatar = true, onRetryMessage }: MessageBubbleProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get channel-specific styling
  const getChannelStyles = (channel: string, isIncoming: boolean) => {
    const baseStyles = "px-3 py-2 rounded-xl backdrop-blur-sm border";
    
    if (isIncoming) {
      return cn(baseStyles, "message-bubble-incoming");
    }
    
    return cn(baseStyles, "message-bubble-outgoing");
  };

  // Handle retry message
  const handleRetryMessage = async () => {
    if (onRetryMessage) {
      try {
        await onRetryMessage(message.id);
        toast({
          title: "Message Retry",
          description: "Attempting to resend message...",
        });
      } catch (error) {
        toast({
          title: "Retry Failed",
          description: "Unable to retry message. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Get status color and tooltip text
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'sending':
        return {
          color: 'hsl(var(--status-sending))',
          tooltip: 'Message is being sent...',
          className: 'status-sending'
        };
      case 'sent':
        return {
          color: 'hsl(var(--status-delivered))',
          tooltip: 'Message sent successfully',
          className: ''
        };
      case 'delivered':
        return {
          color: 'hsl(var(--status-delivered))',
          tooltip: 'Message delivered to recipient',
          className: ''
        };
      case 'read':
        return {
          color: 'hsl(var(--status-read))',
          tooltip: 'Message read by recipient',
          className: ''
        };
      case 'failed':
        return {
          color: 'hsl(var(--status-failed))',
          tooltip: 'Failed to send message. Click to retry.',
          className: 'status-failed'
        };
      default:
        return {
          color: 'hsl(var(--muted-foreground))',
          tooltip: 'Unknown status',
          className: ''
        };
    }
  };

  // Render delivery status indicators
  const renderDeliveryStatus = (message: any) => {
    if (!message.deliveryStatus || message.direction === 'inbound') return null;
    
    const statusInfo = getStatusInfo(message.deliveryStatus);
    
    // Common status indicators for all channels
    const renderStatusIcon = () => {
      switch (message.deliveryStatus) {
        case 'sending':
          return <Loader2 className="w-3 h-3 animate-spin" style={{ color: statusInfo.color }} />;
        case 'failed':
          return (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" style={{ color: statusInfo.color }} />
              {onRetryMessage && (
                <Button
                  onClick={handleRetryMessage}
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs hover:bg-transparent"
                  style={{ color: statusInfo.color }}
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </Button>
              )}
            </div>
          );
        default:
          break;
      }
      
      // Channel-specific indicators for successful states
      switch (message.channel) {
        case 'whatsapp':
          return (
            <div className="flex items-center space-x-0.5">
              {message.deliveryStatus === 'read' ? (
                <CheckCheck className="w-3 h-3" style={{ color: statusInfo.color }} />
              ) : (
                <CheckCheck className="w-3 h-3" style={{ color: statusInfo.color }} />
              )}
            </div>
          );
        case 'imessage':
          return (
            <div className="text-[9px]" style={{ color: statusInfo.color }}>
              {message.deliveryStatus === 'delivered' && 'Delivered'}
              {message.deliveryStatus === 'read' && 'Read'}
              {message.deliveryStatus === 'sent' && 'Sent'}
            </div>
          );
        case 'sms':
          return (
            <div className="text-[9px]" style={{ color: statusInfo.color }}>
              {message.deliveryStatus === 'delivered' && 'Delivered'}
              {message.deliveryStatus === 'sent' && 'Sent'}
            </div>
          );
        default:
          return <Check className="w-3 h-3" style={{ color: statusInfo.color }} />;
      }
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center", statusInfo.className)}>
              {renderStatusIcon()}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{statusInfo.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
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

  // Render message content for SMS, WhatsApp, and iMessage
  if (message.type === 'sms' || message.type === 'whatsapp' || message.type === 'imessage') {
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

        <div className={`max-w-xs ${!isIncoming ? 'ml-auto' : ''}`}>
          <div className={getChannelStyles(message.channel || 'sms', isIncoming)}>
            {/* Message Content */}
            <p className={cn(
              "text-sm text-foreground leading-relaxed",
              message.channel === 'imessage' && "message-bubble-imessage-text"
            )}>
              {message.body || message.smsData?.body}
            </p>
            
            {/* Message Effects for iMessage */}
            {message.effects && message.channel === 'imessage' && (
              <div className="text-[10px] text-muted-foreground mt-1 italic">
                Sent with {message.effects} effect
              </div>
            )}
            
            {/* Reactions for iMessage */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex space-x-1 mt-1">
                {message.reactions.map((reaction, idx) => (
                  <span key={idx} className="text-sm">{reaction}</span>
                ))}
              </div>
            )}
          </div>

          {/* Timestamp and Delivery Status */}
          <div className={`flex items-center space-x-1 mt-1 ${!isIncoming ? 'justify-end' : ''}`}>
            <div className="text-[10px] text-muted-foreground">
              {format(message.timestamp, 'h:mm a')}
            </div>
            <div className={message.channel === 'imessage' ? 'delivery-status' : ''}>
              {renderDeliveryStatus(message)}
            </div>
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

  // Render call message
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
          className={`px-3 py-2 rounded-xl backdrop-blur-sm ${
            isIncoming
              ? 'message-bubble-incoming'
              : 'message-bubble-outgoing'
          }`}
        >
          {/* Call Header */}
          <div className="flex items-center space-x-2 mb-1">
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
          </div>

          {/* Call Details */}
          <div className="flex items-center space-x-2 text-[11px] text-muted-foreground mb-2">
            <div className="flex items-center space-x-1">
              <Clock className="w-2.5 h-2.5" />
              <span>{message.duration}</span>
            </div>
            <span>•</span>
            <span>{message.resolution || message.status}</span>
          </div>

          {/* Summary */}
          {message.summary && (
            <div className="mb-2">
              <div className="flex items-start gap-1">
                <div className="flex-1">
                  <p 
                    className="text-xs text-foreground leading-relaxed"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {formatSummaryForDisplay(message.summary)}
                  </p>
                </div>
                <SummaryExpandDialog
                  summary={formatSummaryForDisplay(message.summary)}
                  trigger={
                    <button
                      className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="View full summary"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  }
                />
              </div>
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