import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiSelector } from "@/components/ui/emoji-selector";
import { ChannelSelector, MessageChannel } from "./ChannelSelector";
import { Send, Paperclip, Smile } from "lucide-react";
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
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<MessageChannel>('sms');
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Debug logging
  console.log('ModernMessageInput render:', {
    isDisabled,
    isEmojiOpen,
    selectedAgentPhoneNumber,
    conversationId: conversation.id,
    messageLength: message.length
  });

  const handleSendMessage = async () => {
    if (!message.trim() || isSending || isDisabled) return;

    try {
      setIsSending(true);

      if (selectedChannel === 'sms' || selectedChannel === 'whatsapp') {
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
            title: selectedChannel === 'whatsapp' ? "WhatsApp Sent" : "SMS Sent",
            description: `Your message has been sent via ${selectedChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}.`,
          });
          setMessage("");
          setIsExpanded(false);
        } else {
          throw new Error(result.message || 'Failed to send message');
        }
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

  const handleEmojiSelect = (emoji: string) => {
    const newMessage = message + emoji;
    setMessage(newMessage);
    setIsEmojiOpen(false);

    // Focus back to input after emoji selection
    setTimeout(() => {
      if (isExpanded && textareaRef.current) {
        textareaRef.current.focus();
      } else if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  return (
    <div className="p-[var(--space-lg)] border-t border-white/[0.08] bg-background/30">
      <div className="flex items-end gap-3">
        {/* Channel Selector */}
        <ChannelSelector
          selectedChannel={selectedChannel}
          onChannelChange={setSelectedChannel}
          availableChannels={['sms', 'whatsapp']}
        />

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
          {/* Emoji Button */}
          <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-[var(--radius-md)]"
                disabled={false}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="p-0 border-0 shadow-none z-50"
              align="end"
              sideOffset={8}
            >
              <EmojiSelector
                onEmojiSelect={(emoji) => {
                  console.log('Emoji selected:', emoji);
                  handleEmojiSelect(emoji);
                }}
              />
            </PopoverContent>
          </Popover>

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
      <div className="mt-2 text-[10px] text-center text-muted-foreground">
        {isDisabled ? (
          <span className="text-white">
            Select a specific agent from the dropdown above to send messages
          </span>
        ) : (
          `Press Enter to send ${selectedChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}, Shift+Enter for new line`
        )}
      </div>
    </div>
  );
}