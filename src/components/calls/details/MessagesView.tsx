
import React from "react";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { SecondaryText } from "@/components/ui/typography";

interface Message {
  id: string;
  text: string;
  timestamp: string;
  direction: "inbound" | "outbound";
}

interface MessagesViewProps {
  messages?: Message[];
}

export function MessagesView({ messages = [] }: MessagesViewProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="rounded-full bg-muted/30 p-4 mb-4">
          <MessageSquare className="h-6 w-6 text-muted-foreground" />
        </div>
        <SecondaryText>
          No messages available for this call.
        </SecondaryText>
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.direction === "outbound" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[80%] p-4 rounded-lg shadow-sm ${
              message.direction === "outbound"
                ? "bg-primary/10 dark:bg-[#1A1F2C] border border-border/20 dark:border-white/10"
                : "bg-secondary dark:bg-[#403E43] border border-border/20 dark:border-white/10"
            }`}
          >
            <div className="space-y-2">
              <p className="text-sm leading-relaxed">{message.text}</p>
              <span className="text-xs text-muted-foreground">
                {message.timestamp}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
