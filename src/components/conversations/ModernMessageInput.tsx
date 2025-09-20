import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Phone, Smile, MessageSquare } from "lucide-react";
import { Conversation } from "./types";
import { sendSMS, formatPhoneNumber, isValidPhoneNumber } from "@/lib/api/sms/smsService";
import { useToast } from "@/hooks/use-toast";

interface ModernMessageInputProps {
  conversation: Conversation;
  selectedAgentPhoneNumber?: string | null;
  isDisabled?: boolean; // Disable input when "All Agents" is selected
}

export function ModernMessageInput({ conversation, selectedAgentPhoneNumber, isDisabled = false }: ModernMessageInputProps) {
  const [message, setMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageType, setMessageType] = useState<'sms' | 'call'>('sms');
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!message.trim() || isSending || isDisabled) return;

    try {
      setIsSending(true);

      if (messageType === 'sms') {
        // Validate phone number
        if (!isValidPhoneNumber(conversation.phoneNumber)) {
          toast({
            title: "Invalid Phone Number",
            description: "Please check the phone number format.",
            variant: "destructive",
          });
          return;
        }

        // Send SMS
        const result = await sendSMS({
          to: formatPhoneNumber(conversation.phoneNumber),
          from: selectedAgentPhoneNumber || '', // Use selected agent's phone number if available
          body: message.trim(),
          conversationId: conversation.id
        });

        if (result.success) {
          toast({
            title: "SMS Sent",
            description: "Your message has been sent successfully.",
          });
          setMessage("");
          setIsExpanded(false);
        } else {
          throw new Error(result.message || 'Failed to send SMS');
        }
      } else {
        // Handle call logic here
        console.log("Initiating call to:", conversation.phoneNumber);
        toast({
          title: "Call Initiated",
          description: "Calling " + conversation.displayName,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    if (e.key === "Enter" && e.shiftKey && !isExpanded) {
      e.preventDefault();
      setIsExpanded(true);
      // Focus textarea after expansion
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.value = message + "\n";
          setMessage(message + "\n");
        }
      }, 0);
    }
  };

  const handleCall = () => {
    console.log("Initiating call to:", conversation.phoneNumber);
  };

  const handleFocus = () => {
    if (message.includes("\n") || message.length > 50) {
      setIsExpanded(true);
    }
  };

  return (
    <div className="p-[var(--space-lg)] border-t border-white/[0.08] bg-background/30">
      <div className="flex items-end gap-3">
        {/* Attachment Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-[var(--radius-md)]"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Message Input */}
        <div className="flex-1">
          {isExpanded ? (
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={() => {
                if (!message.trim()) {
                  setIsExpanded(false);
                }
              }}
              placeholder={isDisabled ? "Select a specific agent to send messages" : `Message ${conversation.displayName}...`}
              className="min-h-[2.25rem] max-h-32 resize-none text-sm bg-background/80 border-border/40 focus:border-border/60 rounded-[var(--radius-md)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              rows={3}
              disabled={isDisabled}
            />
          ) : (
            <Input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              onFocus={handleFocus}
              placeholder={isDisabled ? "Select a specific agent to send messages" : `Message ${conversation.displayName}...`}
              className="h-9 text-sm bg-background/80 border-border/40 focus:border-border/60 rounded-[var(--radius-md)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isDisabled}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Message Type Toggle */}
          <div className="flex items-center bg-muted/30 rounded-[var(--radius-md)] p-1">
            <Button
              variant={messageType === 'sms' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMessageType('sms')}
              className="h-7 px-2 text-xs"
              disabled={isDisabled}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              SMS
            </Button>
            <Button
              variant={messageType === 'call' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMessageType('call')}
              className="h-7 px-2 text-xs"
              disabled={isDisabled}
            >
              <Phone className="h-3 w-3 mr-1" />
              Call
            </Button>
          </div>

          {/* Emoji Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-[var(--radius-md)]"
            disabled={isDisabled}
          >
            <Smile className="h-4 w-4" />
          </Button>

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isSending || isDisabled}
            size="sm"
            className="h-9 w-9 p-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[var(--radius-md)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Helper Text */}
      <div className="mt-2 text-[10px] text-muted-foreground">
        {isDisabled ? (
          <span className="text-amber-600 dark:text-amber-400">
            Select a specific agent from the dropdown above to send messages
          </span>
        ) : messageType === 'sms' ? (
          'Press Enter to send SMS, Shift+Enter for new line'
        ) : (
          'Press Enter to initiate call, Shift+Enter for new line'
        )}
      </div>
    </div>
  );
}