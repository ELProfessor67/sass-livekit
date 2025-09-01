import { Call } from "@/components/calls/types";

export interface Conversation {
  id: string;
  contactId: string;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  totalCalls: number;
  lastActivityDate: string;
  lastActivityTime: string;
  lastActivityTimestamp: Date;
  lastCallOutcome?: string;
  calls: Call[];
  totalDuration: string;
  outcomes: {
    appointments: number;
    qualified: number;
    notQualified: number;
    spam: number;
  };
}

export interface ConversationsData {
  conversations: Conversation[];
  total: number;
}