import { Call } from "@/components/calls/types";
import { Conversation } from "@/components/conversations/types";
import { normalizeResolution } from "@/components/dashboard/call-outcomes/utils";

// Normalize phone numbers for grouping
const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '').replace(/^1/, ''); // Remove non-digits and leading 1
};

// Calculate total duration from multiple calls
const calculateTotalDuration = (calls: Call[]): string => {
  const totalSeconds = calls.reduce((total, call) => {
    const [minutes, seconds] = call.duration.split(':').map(Number);
    return total + (minutes * 60) + (seconds || 0);
  }, 0);
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Count outcomes for a conversation
const countOutcomes = (calls: Call[]) => {
  const outcomes = {
    appointments: 0,
    qualified: 0,
    notQualified: 0,
    spam: 0
  };

  calls.forEach(call => {
    const outcome = normalizeResolution(call.resolution || '').toLowerCase();
    if (outcome.includes('appointment') || outcome.includes('booked')) {
      outcomes.appointments++;
    } else if (outcome.includes('qualified') && !outcome.includes('not')) {
      outcomes.qualified++;
    } else if (outcome.includes('not qualified') || outcome.includes('not eligible')) {
      outcomes.notQualified++;
    } else if (outcome.includes('spam')) {
      outcomes.spam++;
    }
  });

  return outcomes;
};

// Convert calls to conversations grouped by contact
export const groupCallsIntoConversations = (calls: Call[]): Conversation[] => {
  const conversationMap = new Map<string, Call[]>();

  // Group calls by normalized phone number
  calls.forEach(call => {
    const normalizedPhone = normalizePhoneNumber(call.phoneNumber);
    if (!conversationMap.has(normalizedPhone)) {
      conversationMap.set(normalizedPhone, []);
    }
    conversationMap.get(normalizedPhone)!.push(call);
  });

  // Convert groups to conversation objects
  const conversations: Conversation[] = [];

  conversationMap.forEach((callGroup, phoneKey) => {
    // Sort calls by date (newest first)
    const sortedCalls = callGroup.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
      return dateB.getTime() - dateA.getTime();
    });

    const mostRecentCall = sortedCalls[0];
    const lastActivityTimestamp = new Date(`${mostRecentCall.date}T${mostRecentCall.time || '00:00'}`);

    // Determine display name from most complete contact info
    let displayName = 'Unknown Contact';
    let firstName = '';
    let lastName = '';

    for (const call of sortedCalls) {
      if (call.first_name && call.first_name !== 'NA') {
        firstName = call.first_name;
      }
      if (call.last_name && call.last_name !== 'NA') {
        lastName = call.last_name;
      }
      if (call.name && call.name !== 'Unknown' && !call.name.includes('NA')) {
        displayName = call.name;
        break;
      }
    }

    if (firstName || lastName) {
      displayName = [firstName, lastName].filter(Boolean).join(' ');
    }

    const conversation: Conversation = {
      id: `conv-${phoneKey}`,
      contactId: phoneKey,
      phoneNumber: mostRecentCall.phoneNumber,
      firstName,
      lastName,
      displayName,
      totalCalls: sortedCalls.length,
      lastActivityDate: mostRecentCall.date,
      lastActivityTime: mostRecentCall.time,
      lastActivityTimestamp,
      lastCallOutcome: mostRecentCall.resolution,
      calls: sortedCalls,
      totalDuration: calculateTotalDuration(sortedCalls),
      outcomes: countOutcomes(sortedCalls)
    };

    conversations.push(conversation);
  });

  // Sort conversations by last activity (most recent first)
  return conversations.sort((a, b) => 
    b.lastActivityTimestamp.getTime() - a.lastActivityTimestamp.getTime()
  );
};