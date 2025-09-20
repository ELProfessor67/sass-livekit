import { Call } from "@/components/calls/types";
import { SMSMessage } from "@/lib/api/sms/smsService";

export interface Conversation {
  id: string;
  contactId: string;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  totalCalls: number;
  totalSMS: number;
  lastActivityDate: string;
  lastActivityTime: string;
  lastActivityTimestamp: Date;
  lastCallOutcome?: string;
  calls: Call[];
  smsMessages: SMSMessage[];
  totalDuration: string;
  outcomes: {
    appointments: number;
    qualified: number;
    notQualified: number;
    spam: number;
  };
  hasNewMessages?: boolean;
  hasNewSMS?: boolean;
  hasNewCalls?: boolean;
}

export interface ConversationsData {
  conversations: Conversation[];
  total: number;
}