import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, Building, Calendar, Plus, Edit, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Conversation } from "./types";
import { ContactProperty } from "./ContactProperty";

interface ContactInfoPanelProps {
  conversation: Conversation;
}

export function ContactInfoPanel({ conversation }: ContactInfoPanelProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Mock contact properties - in real app, these would come from the conversation data
  const contactProperties = [
    { label: "Email", value: "contact@example.com", icon: Mail },
    { label: "Company", value: "Acme Corp", icon: Building },
    { label: "Location", value: "New York, NY", icon: MapPin },
    { label: "Last Contact", value: formatDistanceToNow(conversation.lastActivityTimestamp, { addSuffix: true }), icon: Calendar },
  ];

  const handleAddProperty = () => {
    // TODO: Implement add property dialog
    console.log("Add property clicked");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-[var(--space-lg)] border-b border-white/[0.08] bg-background/30">
        <div className="flex items-center justify-between mb-[var(--space-lg)]">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl font-medium bg-muted text-muted-foreground">
                {getInitials(conversation.displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-medium text-foreground">
                {conversation.displayName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {conversation.phoneNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <div className="flex-1 p-[var(--space-lg)] overflow-y-auto">
        <div className="space-y-[var(--space-md)]">
          {/* Overview Stats */}
          <div className="space-y-[var(--space-md)]">
            <h3 className="text-sm font-medium text-foreground">Overview</h3>
            <div className="grid grid-cols-2 gap-[var(--space-md)]">
              <div className="p-[var(--space-md)] bg-muted/20 rounded-[var(--radius-md)] border border-border/20">
                <div className="text-[10px] text-muted-foreground">Total Calls</div>
                <div className="text-base font-medium text-foreground mt-1">{conversation.totalCalls}</div>
              </div>
              <div className="p-[var(--space-md)] bg-muted/20 rounded-[var(--radius-md)] border border-border/20">
                <div className="text-[10px] text-muted-foreground">Duration</div>
                <div className="text-base font-medium text-foreground mt-1">{conversation.totalDuration}</div>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-[var(--space-md)]">
            <h3 className="text-sm font-medium text-foreground">Contact Details</h3>
            <div className="space-y-[var(--space-sm)]">
              <ContactProperty label="Email" value="john.doe@company.com" icon={Mail} />
              <ContactProperty label="Company" value="Acme Corp" icon={Building} />
              <ContactProperty label="Location" value="San Francisco, CA" icon={MapPin} />
              <ContactProperty label="Last Contact" value={conversation.lastActivityDate} icon={Calendar} />
            </div>
          </div>

          {/* Last Call Outcome */}
          <div className="space-y-[var(--space-md)]">
            <h3 className="text-sm font-medium text-foreground">Last Call Outcome</h3>
            <div className="p-[var(--space-md)] bg-muted/10 rounded-[var(--radius-md)] border border-border/10">
              <Badge variant="secondary" className="text-xs px-3 py-1">
                {conversation.lastCallOutcome || 'No outcome recorded'}
              </Badge>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-[var(--space-md)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Notes</h3>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-3 rounded-[var(--radius-md)]">
                Add Note
              </Button>
            </div>
            <div className="p-[var(--space-md)] bg-muted/10 rounded-[var(--radius-md)] border border-border/10 text-xs text-muted-foreground text-center">
              No notes yet
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}