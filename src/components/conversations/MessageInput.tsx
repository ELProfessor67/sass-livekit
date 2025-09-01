import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Phone, Paperclip } from "lucide-react";
import { Conversation } from "./types";

interface MessageInputProps {
  conversation: Conversation;
}

export function MessageInput({ conversation }: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (message.trim()) {
      // TODO: Implement message sending logic
      console.log("Sending message:", message, "to:", conversation.phoneNumber);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCall = () => {
    // TODO: Implement call initiation logic
    console.log("Initiating call to:", conversation.phoneNumber);
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Textarea
            placeholder={`Message ${conversation.displayName}...`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="min-h-[44px] max-h-32 resize-none pr-12"
            rows={1}
          />
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-2 top-2 h-8 w-8 p-0"
            onClick={() => {
              // TODO: Implement file attachment
              console.log("File attachment clicked");
            }}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
        </div>
        <Button
          onClick={handleSendMessage}
          disabled={!message.trim()}
          className="h-11 px-4"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCall}
          className="gap-2"
        >
          <Phone className="w-4 h-4" />
          Call {conversation.displayName}
        </Button>
        
        <div className="text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}