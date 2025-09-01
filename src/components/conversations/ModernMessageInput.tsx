import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Phone, Smile } from "lucide-react";
import { Conversation } from "./types";

interface ModernMessageInputProps {
  conversation: Conversation;
}

export function ModernMessageInput({ conversation }: ModernMessageInputProps) {
  const [message, setMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log("Sending message:", message);
      setMessage("");
      setIsExpanded(false);
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
              placeholder={`Message ${conversation.displayName}...`}
              className="min-h-[2.25rem] max-h-32 resize-none text-sm bg-background/80 border-border/40 focus:border-border/60 rounded-[var(--radius-md)] transition-all duration-200"
              rows={3}
            />
          ) : (
            <Input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              onFocus={handleFocus}
              placeholder={`Message ${conversation.displayName}...`}
              className="h-9 text-sm bg-background/80 border-border/40 focus:border-border/60 rounded-[var(--radius-md)] transition-all duration-200"
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Emoji Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-[var(--radius-md)]"
          >
            <Smile className="h-4 w-4" />
          </Button>

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            size="sm"
            className="h-9 w-9 p-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[var(--radius-md)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Send className="h-4 w-4" />
          </Button>

          {/* Call Button */}
          <Button
            onClick={handleCall}
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0 border-border/40 hover:border-border/60 hover:bg-accent/50 rounded-[var(--radius-md)] transition-all duration-200"
          >
            <Phone className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Helper Text */}
      <div className="mt-2 text-[10px] text-muted-foreground">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}