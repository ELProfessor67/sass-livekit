import { Call } from "@/components/calls/types";
import { SMSMessage } from "@/lib/api/sms/smsService";

// Enhanced message interface for UI-only multi-channel support
export interface Message {
  id: string;
  type: 'call' | 'sms' | 'whatsapp' | 'imessage';
  channel?: 'sms' | 'whatsapp' | 'imessage'; // Optional for call messages
  timestamp: Date;
  direction: string;
  
  // Delivery status tracking (UI only)
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  
  // Call-specific properties
  duration?: string;
  status?: string;
  resolution?: string;
  summary?: string;
  recording?: string;
  transcript?: any;
  
  // Message-specific properties
  body?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  
  // Platform-specific features (UI only)
  reactions?: string[]; // iMessage reactions
  typing?: boolean; // Real-time typing indicators
  effects?: 'slam' | 'loud' | 'gentle' | 'invisible'; // iMessage effects
  
  // Common properties
  date: string;
  time: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  company?: string; // Added for UI enhancement
  totalCalls: number;
  totalSMS: number;
  lastActivityDate: string;
  lastActivityTime: string;
  lastActivityTimestamp: Date;
  lastCallOutcome?: string;
  calls: Call[];
  smsMessages: SMSMessage[];
  // Add unified messages for UI (mock data only)
  messages?: Message[];
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