import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { Conversation } from "@/components/conversations/types";
import { SMSMessage } from "@/lib/api/sms/smsService";
import { formatPhoneNumber } from "@/utils/formatUtils";
import { getCurrentUserIdAsync } from "@/lib/user-context";

/**
 * Get assistant IDs for the current user
 */
async function getUserAssistantIds(): Promise<string[]> {
  const userId = await getCurrentUserIdAsync();
  const { data: assistants, error } = await supabase
    .from('assistant')
    .select('id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user assistants:', error);
    return [];
  }

  return assistants?.map(a => a.id) || [];
}

/**
 * PROGRESSIVE LOADING CONVERSATIONS API
 * 
 * This file implements a progressive loading strategy for conversations to handle large datasets:
 * 1. fetchContactList() - Loads lightweight contact list first (fast initial display)
 * 2. fetchConversationDetails() - Loads last 7 days of specific contact (on-demand)
 * 3. loadConversationHistory() - Loads older data when user scrolls up (pagination)
 * 
 * SCHEMA NOTE: The current Supabase schema may not include call_sid and recording_sid fields
 * in the call_history table. These fields are handled with type assertions as optional.
 * 
 * USAGE:
 * - Use getConversationsProgressive() for the new approach
 * - Use fetchConversations() for the old approach (deprecated for large datasets)
 */

export interface CallHistoryRecord {
  id: string;
  call_id: string;
  assistant_id: string;
  phone_number: string;
  participant_identity: string;
  start_time: string;
  end_time: string;
  call_duration: number;
  call_status: string;
  transcription: any; // Using any for transcription to avoid complex Json vs Array conflicts
  call_sid?: string;
  recording_sid?: string;
  call_summary?: string;
  success_evaluation?: string;
  structured_data?: any;
  call_outcome?: string;      // Added missing field
  outcome_confidence?: number; // Added missing field
  created_at: string;
  updated_at: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
}

export interface ContactSummary {
  id: string;
  phoneNumber: string;
  displayName: string;
  firstName: string;
  lastName: string;
  lastActivityDate: string;
  lastActivityTime: string;
  lastActivityTimestamp: Date;
  totalCalls: number;
  totalSMS: number;
  lastCallOutcome?: string;
  totalDuration: string;
  outcomes: {
    appointments: number;
    qualified: number;
    notQualified: number;
    spam: number;
  };
}

export interface ConversationDetailsResponse {
  conversation: Conversation;
  hasMoreHistory: boolean;
  nextOffset: number;
}

export interface LoadMoreHistoryResponse {
  calls: any[];
  smsMessages: SMSMessage[];
  hasMoreHistory: boolean;
  nextOffset: number;
}

/**
 * Fetch conversations from call_history table
 * @deprecated Use fetchContactList() and fetchConversationDetails() for better performance
 */
export const fetchConversations = async (shouldSort: boolean = true): Promise<ConversationsResponse> => {
  try {
    const userId = await getCurrentUserIdAsync();
    const assistantIds = await getUserAssistantIds();
    console.log('Fetching conversations for user ID:', userId, 'with assistants:', assistantIds);

    if (assistantIds.length === 0) {
      console.log('No assistants found for user, returning empty conversations');
      return {
        conversations: [],
        total: 0
      };
    }

    const { data: callHistory, error } = await supabase
      .from('call_history')
      .select('*')
      .in('assistant_id', assistantIds)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching call history:', error);
      throw error;
    }

    // Debug logging for database results
    console.log('Database Debug - Raw call history:', {
      totalCalls: callHistory?.length || 0,
      sampleCall: callHistory?.[0] ? {
        id: callHistory[0].id,
        hasStructuredData: !!callHistory[0].structured_data,
        structuredDataType: typeof callHistory[0].structured_data,
        structuredDataContent: callHistory[0].structured_data
      } : null
    });

    if (!callHistory || callHistory.length === 0) {
      return {
        conversations: [],
        total: 0
      };
    }

    // Group calls by phone number to create conversations
    const conversationsMap = new Map<string, Conversation>();

    // Fetch ALL SMS messages first (not just for existing call numbers)
    const smsMessagesMap = new Map<string, SMSMessage[]>();

    try {
      console.log('📱 Fetching SMS messages for user ID:', userId);
      const { data: smsMessages, error: smsError } = await supabase
        .from('sms_messages')
        .select('*')
        .eq('user_id', userId)
        .order('date_created', { ascending: false });

      if (!smsError && smsMessages) {
        console.log(`📱 Found ${smsMessages.length} SMS messages`);
        if (smsMessages.length > 0) {
          console.log('📱 SMS messages details:', smsMessages.map(sms => ({
            messageSid: sms.message_sid,
            from: sms.from_number,
            to: sms.to_number,
            body: sms.body?.substring(0, 50) + '...',
            direction: sms.direction as 'inbound' | 'outbound',
            dateCreated: sms.date_created
          })));
        } else {
          console.log('⚠️ NO SMS MESSAGES FOUND IN DATABASE!');
        }
        smsMessages.forEach(sms => {
          // Determine which phone number this SMS belongs to
          const phoneNumber = sms.direction === 'inbound' ? sms.from_number : sms.to_number;
          console.log(`📱 Grouping SMS: ${sms.direction} from ${sms.from_number} to ${sms.to_number} -> phoneNumber: ${phoneNumber}`);
          if (!smsMessagesMap.has(phoneNumber)) {
            smsMessagesMap.set(phoneNumber, []);
          }
          smsMessagesMap.get(phoneNumber)!.push({
            messageSid: sms.message_sid,
            to: sms.to_number,
            from: sms.from_number,
            body: sms.body,
            direction: sms.direction as 'inbound' | 'outbound',
            status: sms.status,
            dateCreated: sms.date_created,
            dateSent: sms.date_sent,
            dateUpdated: sms.date_updated,
            errorCode: sms.error_code,
            errorMessage: sms.error_message,
            numSegments: sms.num_segments,
            price: sms.price,
            priceUnit: sms.price_unit
          });
        });
        console.log(`📱 Grouped SMS messages for ${smsMessagesMap.size} phone numbers`);
        console.log('📱 SMS grouping details:', Array.from(smsMessagesMap.entries()).map(([phone, messages]) => ({
          phoneNumber: phone,
          messageCount: messages.length,
          messageSids: messages.map(m => m.messageSid)
        })));
      } else {
        console.error('Error fetching SMS messages:', smsError);
      }
    } catch (error) {
      console.error('Error fetching SMS messages:', error);
    }

    // Process calls with async recording fetches
    const processedCalls = await Promise.all(
      callHistory.map(async (call: CallHistoryRecord) => {
        try {
          const phoneNumber = call.phone_number;
          const participantName = formatPhoneNumber(call.phone_number); // Use formatted phone number instead of participant identity

          // Process transcription data to the expected format
          const processedTranscript = call.transcription?.map((entry: any) => {
            // Extract content from array format
            let content = '';
            if (Array.isArray(entry.content)) {
              content = entry.content.join(' ').trim();
            } else if (typeof entry.content === 'string') {
              content = entry.content;
            } else {
              content = String(entry.content || '');
            }

            return {
              speaker: entry.role === 'user' ? 'Customer' : entry.role === 'assistant' ? 'Agent' : entry.role,
              time: format(new Date(call.start_time), 'HH:mm'),
              text: content
            };
          }) || [];

          // Recording is fetched on-demand in MessageBubble via useRecording (like voiceagents)

          // Extract contact name from structured data if available, otherwise use formatted phone
          let contactName = participantName; // Default to formatted phone number
          let hasStructuredName = false;

          if (call.structured_data && typeof call.structured_data === 'object') {
            const structuredData = call.structured_data;

            // Helper function to extract value from structured data field
            const extractValue = (field: any): string | undefined => {
              if (typeof field === 'string') {
                return field;
              } else if (field && typeof field === 'object' && field.value) {
                return field.value;
              }
              return undefined;
            };

            // Try to find customer name in structured data
            const customerNameField = structuredData['Customer Name'] || structuredData['name'] || structuredData['full_name'] || structuredData['contact_name'] || structuredData['client_name'];
            if (customerNameField) {
              const extractedName = extractValue(customerNameField);
              if (extractedName && extractedName.trim() !== '') {
                contactName = extractedName; // Only name, no phone number
                hasStructuredName = true;
              }
            }
          }

          // If no structured name found, use only formatted phone number
          if (!hasStructuredName) {
            contactName = participantName; // Just formatted phone number
          }

          // Add call to conversation
          const callData = {
            id: call.id,
            name: contactName,
            phoneNumber: call.phone_number,
            date: format(new Date(call.start_time), 'yyyy-MM-dd'),
            time: format(new Date(call.start_time), 'HH:mm'),
            duration: formatDuration(call.call_duration),
            direction: 'inbound' as const,
            channel: 'voice' as const,
            tags: [],
            status: call.call_status,
            resolution: determineCallResolution(call.transcription, call.call_status, call.call_outcome, call.outcome_confidence),
            call_recording: '',
            summary: call.call_summary,
            transcript: processedTranscript,
            analysis: call.structured_data || null,
            address: '',
            messages: [],
            phone_number: call.phone_number,
            call_outcome: determineCallResolution(call.transcription, call.call_status, call.call_outcome, call.outcome_confidence),
            created_at: call.start_time,
            call_sid: (call as any).call_sid,
            recording_info: null,
            assistant_id: call.assistant_id,
            structured_data: call.structured_data
          };

          return { callData, phoneNumber, participantName };
        } catch (error) {
          console.error('Error processing call:', call.id, error);
          return null;
        }
      })
    );

    // Filter out failed calls and ensure only calls from user's assistants are included
    // This is a defensive check - database query already filters, but this ensures correctness
    processedCalls
      .filter(Boolean)
      .filter(({ callData }) => {
        // Only include calls that have an assistant_id matching one of the user's assistants
        return callData.assistant_id && assistantIds.includes(callData.assistant_id);
      })
      .forEach(({ callData, phoneNumber, participantName }) => {
        if (!conversationsMap.has(phoneNumber)) {
          // Create new conversation
          const conversation: Conversation = {
            id: `conv_${phoneNumber}`,
            contactId: `contact_${phoneNumber}`,
            phoneNumber: phoneNumber,
            firstName: participantName.split(' ')[0] || 'Unknown',
            lastName: participantName.split(' ').slice(1).join(' ') || '',
            displayName: participantName,
            totalCalls: 0,
            totalSMS: smsMessagesMap.get(phoneNumber)?.length || 0,
            lastActivityDate: '',
            lastActivityTime: '',
            lastActivityTimestamp: new Date(),
            lastCallOutcome: undefined,
            calls: [],
            smsMessages: smsMessagesMap.get(phoneNumber) || [],
            totalDuration: '0:00',
            outcomes: {
              appointments: 0,
              qualified: 0,
              notQualified: 0,
              spam: 0
            }
          };
          conversationsMap.set(phoneNumber, conversation);
        }

        const conversation = conversationsMap.get(phoneNumber)!;
        conversation.calls.push(callData);
        conversation.totalCalls += 1;

        // Update last activity and participant identity
        const callTime = new Date(callData.created_at);
        if (callTime > conversation.lastActivityTimestamp) {
          conversation.lastActivityDate = callData.date;
          conversation.lastActivityTime = callData.time;
          conversation.lastActivityTimestamp = callTime;
          conversation.lastCallOutcome = callData.resolution;
          // Update display name to use the latest call's participant identity (real name)
          conversation.displayName = callData.name;
          conversation.firstName = callData.name.split(' ')[0] || 'Unknown';
          conversation.lastName = callData.name.split(' ').slice(1).join(' ') || '';
        }

        // Also check if SMS messages have more recent activity
        const smsMessages = conversation.smsMessages || [];
        if (smsMessages.length > 0) {
          const latestSMS = smsMessages[0]; // SMS messages are ordered by date_created desc
          const smsTime = new Date(latestSMS.dateCreated);
          if (smsTime > conversation.lastActivityTimestamp) {
            conversation.lastActivityDate = format(smsTime, 'yyyy-MM-dd');
            conversation.lastActivityTime = format(smsTime, 'HH:mm');
            conversation.lastActivityTimestamp = smsTime;
          }
        }

        // Update outcomes
        if (callData.resolution) {
          const resolution = callData.resolution.toLowerCase();
          if (resolution.includes('appointment') || resolution.includes('booked')) {
            conversation.outcomes.appointments += 1;
          } else if (resolution.includes('qualified') && !resolution.includes('not')) {
            conversation.outcomes.qualified += 1;
          } else if (resolution.includes('not qualified') || resolution.includes('not eligible')) {
            conversation.outcomes.notQualified += 1;
          } else if (resolution.includes('spam')) {
            conversation.outcomes.spam += 1;
          }
        }

        // Update total duration
        conversation.totalDuration = calculateTotalDuration(conversation.calls);
      });

    // Create conversations for phone numbers that only have SMS messages (no calls)
    smsMessagesMap.forEach((smsMessages, phoneNumber) => {
      if (!conversationsMap.has(phoneNumber)) {
        // Create conversation from SMS messages only
        const firstSms = smsMessages[0]; // Most recent SMS
        const displayName = firstSms.direction === 'inbound' ?
          `Contact ${phoneNumber}` :
          `Contact ${phoneNumber}`;

        console.log(`📱 Creating SMS-only conversation for ${phoneNumber} with ${smsMessages.length} messages`);

        const conversation: Conversation = {
          id: `conv_${phoneNumber}`,
          contactId: `contact_${phoneNumber}`,
          phoneNumber: phoneNumber,
          firstName: displayName.split(' ')[0] || 'Unknown',
          lastName: displayName.split(' ').slice(1).join(' ') || '',
          displayName: displayName,
          totalCalls: 0,
          totalSMS: smsMessages.length,
          lastActivityDate: format(new Date(firstSms.dateCreated), 'yyyy-MM-dd'),
          lastActivityTime: format(new Date(firstSms.dateCreated), 'HH:mm'),
          lastActivityTimestamp: new Date(firstSms.dateCreated),
          lastCallOutcome: undefined,
          calls: [],
          smsMessages: smsMessages,
          totalDuration: '0:00',
          outcomes: {
            appointments: 0,
            qualified: 0,
            notQualified: 0,
            spam: 0
          }
        };
        conversationsMap.set(phoneNumber, conversation);
      }
    });

    // Convert map to array and conditionally sort by last activity
    const conversations = Array.from(conversationsMap.values());

    if (shouldSort) {
      conversations.sort((a, b) => b.lastActivityTimestamp.getTime() - a.lastActivityTimestamp.getTime());
    }

    console.log('📊 Final conversations summary:', {
      totalConversations: conversations.length,
      conversationsWithSMS: conversations.filter(c => c.totalSMS > 0).length,
      conversationsWithCalls: conversations.filter(c => c.totalCalls > 0).length,
      smsOnlyConversations: conversations.filter(c => c.totalSMS > 0 && c.totalCalls === 0).length,
      totalSMSMessages: conversations.reduce((sum, c) => sum + c.totalSMS, 0),
      conversations: conversations.map(c => ({
        id: c.id,
        phoneNumber: c.phoneNumber,
        totalSMS: c.totalSMS,
        totalCalls: c.totalCalls,
        lastActivity: c.lastActivityTimestamp.toISOString()
      }))
    });

    // Debug: Show which conversations have the specific phone number from the SMS
    const smsPhoneNumber = '+12017656193';
    const matchingConversation = conversations.find(c => c.phoneNumber === smsPhoneNumber);
    console.log(`🔍 Looking for conversation with phone number ${smsPhoneNumber}:`, {
      found: !!matchingConversation,
      conversationId: matchingConversation?.id,
      totalSMS: matchingConversation?.totalSMS,
      totalCalls: matchingConversation?.totalCalls
    });

    return {
      conversations,
      total: conversations.length
    };

  } catch (error) {
    console.error('Error fetching conversations:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Fetch lightweight contact list for initial display
 */
export const fetchContactList = async (limit: number = 50, assistantIds: string[] = []): Promise<ContactSummary[]> => {
  try {
    const userId = await getCurrentUserIdAsync();

    // Use provided assistantIds or fetch all for user
    const effectiveAssistantIds = assistantIds.length > 0 ? assistantIds : await getUserAssistantIds();

    console.log('📋 Fetching contact list for user ID:', userId, 'with assistants:', effectiveAssistantIds);

    if (effectiveAssistantIds.length === 0) {
      console.log('No assistants found for user, returning empty contact list');
      return [];
    }

    // Check if the required tables exist by trying to access them
    let callHistory: any[] = [];
    let smsCounts: any[] = [];

    try {
      // Try to get call history
      const { data: callData, error: callError } = await supabase
        .from('call_history')
        .select('phone_number, participant_identity, start_time, call_duration, call_status, transcription, call_summary, success_evaluation, structured_data')
        .in('assistant_id', effectiveAssistantIds)
        .order('start_time', { ascending: false })
        .limit(limit * 10);

      if (callError) {
        console.warn('⚠️ call_history table not available, using fallback data:', callError.message);
        callHistory = [];
      } else {
        callHistory = callData || [];
      }
    } catch (error) {
      console.warn('⚠️ call_history table not accessible, using fallback data');
      callHistory = [];
    }

    try {
      // Try to get SMS counts
      const { data: smsData, error: smsError } = await supabase
        .from('sms_messages')
        .select('from_number, to_number, direction, date_created')
        .eq('user_id', userId)
        .order('date_created', { ascending: false });

      if (smsError) {
        console.warn('⚠️ sms_messages table not available, using fallback data:', smsError.message);
        smsCounts = [];
      } else {
        smsCounts = smsData || [];
      }
    } catch (error) {
      console.warn('⚠️ sms_messages table not accessible, using fallback data');
      smsCounts = [];
    }

    // Group calls by phone number
    const contactsMap = new Map<string, {
      phoneNumber: string;
      participantIdentity: string;
      lastActivity: Date;
      calls: any[];
      totalDuration: number;
      lastCallOutcome?: string;
    }>();

    if (callHistory) {
      callHistory.forEach(call => {
        const phoneNumber = call.phone_number;
        const callTime = new Date(call.start_time);

        // Extract contact name from structured data if available, otherwise use formatted phone
        let contactName = formatPhoneNumber(call.phone_number); // Default to formatted phone number
        let hasStructuredName = false;

        if (call.structured_data && typeof call.structured_data === 'object') {
          const structuredData = call.structured_data;

          // Helper function to extract value from structured data field
          const extractValue = (field: any): string | undefined => {
            if (typeof field === 'string') {
              return field;
            } else if (field && typeof field === 'object' && field.value) {
              return field.value;
            }
            return undefined;
          };

          // Try to find customer name in structured data
          const customerNameField = structuredData['Customer Name'] || structuredData['name'] || structuredData['full_name'] || structuredData['contact_name'] || structuredData['client_name'];
          if (customerNameField) {
            const extractedName = extractValue(customerNameField);
            if (extractedName && extractedName.trim() !== '') {
              contactName = `${extractedName} - ${formatPhoneNumber(call.phone_number)}`; // Name + formatted phone
              hasStructuredName = true;
            }
          }
        }

        // If no structured name found, use only formatted phone number
        if (!hasStructuredName) {
          contactName = formatPhoneNumber(call.phone_number); // Just formatted phone number
        }

        if (!contactsMap.has(phoneNumber)) {
          contactsMap.set(phoneNumber, {
            phoneNumber,
            participantIdentity: contactName,
            lastActivity: callTime,
            calls: [],
            totalDuration: 0,
            lastCallOutcome: undefined
          });
        }

        const contact = contactsMap.get(phoneNumber)!;
        contact.calls.push(call);
        contact.totalDuration += call.call_duration || 0;

        if (callTime > contact.lastActivity) {
          contact.lastActivity = callTime;
          contact.lastCallOutcome = determineCallResolution(call.transcription, call.call_status, call.call_outcome, call.outcome_confidence);
          // Update participant identity to use the latest call's contact name
          contact.participantIdentity = contactName;
        }
      });
    }

    // Group SMS messages by phone number
    const smsCountsMap = new Map<string, number>();
    if (smsCounts) {
      smsCounts.forEach(sms => {
        const phoneNumber = sms.direction === 'inbound' ? sms.from_number : sms.to_number;
        smsCountsMap.set(phoneNumber, (smsCountsMap.get(phoneNumber) || 0) + 1);
      });
    }

    // Convert to ContactSummary array
    let contacts: ContactSummary[] = Array.from(contactsMap.values())
      .map(contact => {
        const displayName = contact.participantIdentity;
        const nameParts = displayName.split(' ');

        return {
          id: `contact_${contact.phoneNumber}`,
          phoneNumber: contact.phoneNumber,
          displayName,
          firstName: nameParts[0] || 'Unknown',
          lastName: nameParts.slice(1).join(' ') || '',
          lastActivityDate: format(contact.lastActivity, 'yyyy-MM-dd'),
          lastActivityTime: format(contact.lastActivity, 'HH:mm'),
          lastActivityTimestamp: contact.lastActivity,
          totalCalls: contact.calls.length,
          totalSMS: smsCountsMap.get(contact.phoneNumber) || 0,
          lastCallOutcome: contact.lastCallOutcome,
          totalDuration: formatDuration(contact.totalDuration),
          outcomes: {
            appointments: 0,
            qualified: 0,
            notQualified: 0,
            spam: 0
          }
        };
      })
      .sort((a, b) => b.lastActivityTimestamp.getTime() - a.lastActivityTimestamp.getTime())
      .slice(0, limit);

    // If no contacts found from database, return empty array
    if (contacts.length === 0) {
      console.log('📋 No contacts found in database');
      return [];
    }

    console.log(`📋 Found ${contacts.length} contacts`);
    return contacts;

  } catch (error) {
    console.error('Error fetching contact list:', error);
    throw error;
  }
};

/**
 * Fetch conversation details for a specific contact (loads all history by default)
 */
export const fetchConversationDetails = async (
  phoneNumber: string,
  days: number | null = null, // null means load all history
  assistantIds: string[] = []
): Promise<ConversationDetailsResponse> => {
  try {
    const userId = await getCurrentUserIdAsync();
    const effectiveAssistantIds = assistantIds.length > 0 ? assistantIds : await getUserAssistantIds();

    console.log(`📞 Fetching conversation details for ${phoneNumber} ${days !== null ? `(last ${days} days)` : '(all history)'} for user ID: ${userId} with assistants:`, effectiveAssistantIds);

    if (effectiveAssistantIds.length === 0) {
      console.log('No assistants found for user, returning empty conversation details');
      return {
        conversation: {
          id: `conv_${phoneNumber}`,
          contactId: `contact_${phoneNumber}`,
          phoneNumber,
          firstName: 'Unknown',
          lastName: '',
          displayName: formatPhoneNumber(phoneNumber),
          totalCalls: 0,
          totalSMS: 0,
          lastActivityDate: '',
          lastActivityTime: '',
          lastActivityTimestamp: new Date(),
          calls: [],
          smsMessages: [],
          totalDuration: '0:00',
          outcomes: {
            appointments: 0,
            qualified: 0,
            notQualified: 0,
            spam: 0
          }
        } as any,
        hasMoreHistory: false,
        nextOffset: 0
      };
    }

    // Build query - if days is null, load all history; otherwise filter by date
    let callQuery = supabase
      .from('call_history')
      .select('*')
      .eq('phone_number', phoneNumber)
      .in('assistant_id', effectiveAssistantIds);

    // Only apply date filter if days is specified
    if (days !== null) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffISO = cutoffDate.toISOString();
      callQuery = callQuery.gte('start_time', cutoffISO);
    }

    callQuery = callQuery.order('start_time', { ascending: false });

    // Try to fetch recent calls
    let recentCalls: any[] = [];
    try {
      const { data: callData, error: callError } = await callQuery;

      if (callError) {
        console.warn('⚠️ call_history table not available for conversation details:', callError.message);
        recentCalls = [];
      } else {
        recentCalls = callData || [];

        // Debug logging for conversation details
        console.log('Conversation Details Debug - Raw call data:', {
          phoneNumber,
          totalCalls: recentCalls.length,
          sampleCall: recentCalls[0] ? {
            id: recentCalls[0].id,
            hasStructuredData: !!recentCalls[0].structured_data,
            structuredDataType: typeof recentCalls[0].structured_data,
            structuredDataContent: recentCalls[0].structured_data
          } : null
        });
      }
    } catch (error) {
      console.warn('⚠️ call_history table not accessible for conversation details');
      recentCalls = [];
    }

    // Try to fetch recent SMS messages
    let recentSMS: any[] = [];
    try {
      let smsQuery = supabase
        .from('sms_messages')
        .select('*')
        .or(`from_number.eq.${phoneNumber},to_number.eq.${phoneNumber}`)
        .eq('user_id', userId);

      // Only apply date filter if days is specified
      if (days !== null) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffISO = cutoffDate.toISOString();
        smsQuery = smsQuery.gte('date_created', cutoffISO);
      }

      smsQuery = smsQuery.order('date_created', { ascending: false });

      const { data: smsData, error: smsError } = await smsQuery;

      if (smsError) {
        console.warn('⚠️ sms_messages table not available for conversation details:', smsError.message);
        recentSMS = [];
      } else {
        recentSMS = smsData || [];
      }
    } catch (error) {
      console.warn('⚠️ sms_messages table not accessible for conversation details');
      recentSMS = [];
    }

    // Check if there's older history (only relevant if days is specified)
    let hasMoreHistory = false;
    if (days !== null) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffISO = cutoffDate.toISOString();

      const { data: olderCalls, error: olderCallError } = await supabase
        .from('call_history')
        .select('id')
        .eq('phone_number', phoneNumber)
        .in('assistant_id', assistantIds)
        .lt('start_time', cutoffISO)
        .limit(1);

      const { data: olderSMS, error: olderSMSError } = await supabase
        .from('sms_messages')
        .select('id')
        .or(`from_number.eq.${phoneNumber},to_number.eq.${phoneNumber}`)
        .eq('user_id', userId)
        .lt('date_created', cutoffISO)
        .limit(1);

      hasMoreHistory = (olderCalls && olderCalls.length > 0) || (olderSMS && olderSMS.length > 0);
    }

    // Process calls with recording fetches
    const processedCalls = await Promise.all(
      (recentCalls || []).map(async (call: CallHistoryRecord) => {
        try {
          const participantName = formatPhoneNumber(call.phone_number); // Use formatted phone number instead of participant identity

          // Process transcription data
          const processedTranscript = call.transcription?.map((entry: any) => {
            let content = '';
            if (Array.isArray(entry.content)) {
              content = entry.content.join(' ').trim();
            } else if (typeof entry.content === 'string') {
              content = entry.content;
            } else {
              content = String(entry.content || '');
            }

            return {
              speaker: entry.role === 'user' ? 'Customer' : entry.role === 'assistant' ? 'Agent' : entry.role,
              time: format(new Date(call.start_time), 'HH:mm'),
              text: content
            };
          }) || [];

          // Recording is fetched on-demand in MessageBubble via useRecording (like voiceagents)

          // Extract contact name from structured data if available, otherwise use formatted phone
          let contactName = participantName; // Default to formatted phone number
          let hasStructuredName = false;

          if (call.structured_data && typeof call.structured_data === 'object') {
            const structuredData = call.structured_data;

            // Helper function to extract value from structured data field
            const extractValue = (field: any): string | undefined => {
              if (typeof field === 'string') {
                return field;
              } else if (field && typeof field === 'object' && field.value) {
                return field.value;
              }
              return undefined;
            };

            // Try to find customer name in structured data
            const customerNameField = structuredData['Customer Name'] || structuredData['name'] || structuredData['full_name'] || structuredData['contact_name'] || structuredData['client_name'];
            if (customerNameField) {
              const extractedName = extractValue(customerNameField);
              if (extractedName && extractedName.trim() !== '') {
                contactName = extractedName; // Only name, no phone number
                hasStructuredName = true;
              }
            }
          }

          // If no structured name found, use only formatted phone number
          if (!hasStructuredName) {
            contactName = participantName; // Just formatted phone number
          }

          // Debug logging for structured data
          console.log('API Debug - Call structured_data:', {
            callId: call.id,
            hasStructuredData: !!call.structured_data,
            structuredDataType: typeof call.structured_data,
            structuredDataContent: call.structured_data,
            structuredDataKeys: call.structured_data ? Object.keys(call.structured_data) : null
          });

          return {
            id: call.id,
            name: contactName,
            phoneNumber: call.phone_number,
            date: format(new Date(call.start_time), 'yyyy-MM-dd'),
            time: format(new Date(call.start_time), 'HH:mm'),
            duration: formatDuration(call.call_duration),
            direction: 'inbound' as const,
            channel: 'voice' as const,
            tags: [],
            status: call.call_status,
            resolution: determineCallResolution(call.transcription, call.call_status, call.call_outcome, call.outcome_confidence),
            call_recording: '',
            summary: call.call_summary,
            transcript: processedTranscript,
            analysis: call.structured_data || null,
            address: '',
            messages: [],
            phone_number: call.phone_number,
            call_outcome: determineCallResolution(call.transcription, call.call_status, call.call_outcome, call.outcome_confidence),
            created_at: call.start_time,
            call_sid: (call as any).call_sid,
            recording_info: null,
            assistant_id: call.assistant_id,
            structured_data: call.structured_data
          };
        } catch (error) {
          console.error('Error processing call:', call.id, error);
          return null;
        }
      })
    );

    // Process SMS messages
    const processedSMS: SMSMessage[] = (recentSMS || []).map(sms => ({
      messageSid: sms.message_sid,
      to: sms.to_number,
      from: sms.from_number,
      body: sms.body,
      direction: sms.direction,
      status: sms.status,
      dateCreated: sms.date_created,
      dateSent: sms.date_sent,
      dateUpdated: sms.date_updated,
      errorCode: sms.error_code,
      errorMessage: sms.error_message,
      numSegments: sms.num_segments,
      price: sms.price,
      priceUnit: sms.price_unit
    }));

    // Create conversation object
    // Filter to ensure only calls from user's assistants are included (defensive check)
    const validCalls = processedCalls
      .filter(Boolean)
      .filter((call) => call.assistant_id && assistantIds.includes(call.assistant_id));
    // Use the most recent call's participant name (which should have the real contact name)
    const participantName = validCalls[0]?.name || 'Unknown';
    const nameParts = participantName.split(' ');

    const conversation: Conversation = {
      id: `conv_${phoneNumber}`,
      contactId: `contact_${phoneNumber}`,
      phoneNumber: phoneNumber,
      firstName: nameParts[0] || 'Unknown',
      lastName: nameParts.slice(1).join(' ') || '',
      displayName: participantName,
      totalCalls: validCalls.length,
      totalSMS: processedSMS.length,
      lastActivityDate: validCalls[0]?.date || (processedSMS[0]?.dateCreated ? format(new Date(processedSMS[0].dateCreated), 'yyyy-MM-dd') : ''),
      lastActivityTime: validCalls[0]?.time || (processedSMS[0]?.dateCreated ? format(new Date(processedSMS[0].dateCreated), 'HH:mm') : ''),
      lastActivityTimestamp: validCalls[0] ? new Date(validCalls[0].created_at) : processedSMS[0] ? new Date(processedSMS[0].dateCreated) : new Date(),
      lastCallOutcome: validCalls[0]?.resolution,
      calls: validCalls,
      smsMessages: processedSMS,
      totalDuration: calculateTotalDuration(validCalls),
      outcomes: {
        appointments: 0,
        qualified: 0,
        notQualified: 0,
        spam: 0
      }
    };

    // Calculate outcomes
    validCalls.forEach(call => {
      if (call.resolution) {
        const resolution = call.resolution.toLowerCase();
        if (resolution.includes('appointment') || resolution.includes('booked')) {
          conversation.outcomes.appointments += 1;
        } else if (resolution.includes('qualified') && !resolution.includes('not')) {
          conversation.outcomes.qualified += 1;
        } else if (resolution.includes('not qualified') || resolution.includes('not eligible')) {
          conversation.outcomes.notQualified += 1;
        } else if (resolution.includes('spam')) {
          conversation.outcomes.spam += 1;
        }
      }
    });

    // If no data found from database, throw error or return null
    if (validCalls.length === 0 && processedSMS.length === 0) {
      console.log(`📞 No conversation data found for ${phoneNumber}`);
      throw new Error(`No conversation data found for ${phoneNumber}`);
    }

    console.log(`📞 Loaded ${validCalls.length} calls and ${processedSMS.length} SMS messages for ${phoneNumber}`);

    return {
      conversation,
      hasMoreHistory,
      nextOffset: 0
    };

  } catch (error) {
    console.error('Error fetching conversation details:', error);
    throw error;
  }
};

/**
 * Load more conversation history (older data)
 */
export const loadConversationHistory = async (
  phoneNumber: string,
  offset: number = 0,
  limit: number = 20
): Promise<LoadMoreHistoryResponse> => {
  try {
    const userId = await getCurrentUserIdAsync();
    const assistantIds = await getUserAssistantIds();
    console.log(`📜 Loading more history for ${phoneNumber} (offset: ${offset}, limit: ${limit}) for user ID: ${userId} with assistants:`, assistantIds);

    if (assistantIds.length === 0) {
      console.log('No assistants found for user, returning empty history');
      return {
        calls: [],
        smsMessages: [],
        hasMoreHistory: false,
        nextOffset: 0
      };
    }

    // Get the cutoff date based on offset (assuming we're loading older data)
    const { data: recentCall, error: recentCallError } = await supabase
      .from('call_history')
      .select('start_time')
      .eq('phone_number', phoneNumber)
      .in('assistant_id', assistantIds)
      .order('start_time', { ascending: false })
      .limit(1);

    if (recentCallError) {
      console.error('Error fetching recent call for cutoff:', recentCallError);
      throw recentCallError;
    }

    const cutoffDate = recentCall && recentCall.length > 0
      ? recentCall[0].start_time
      : new Date().toISOString();

    // Fetch older calls
    const { data: olderCalls, error: callError } = await supabase
      .from('call_history')
      .select('*')
      .eq('phone_number', phoneNumber)
      .in('assistant_id', assistantIds)
      .lt('start_time', cutoffDate)
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (callError) {
      console.error('Error fetching older calls:', callError);
      throw callError;
    }

    // Fetch older SMS messages
    const { data: olderSMS, error: smsError } = await supabase
      .from('sms_messages')
      .select('*')
      .or(`from_number.eq.${phoneNumber},to_number.eq.${phoneNumber}`)
      .lt('date_created', cutoffDate)
      .order('date_created', { ascending: false })
      .range(offset, offset + limit - 1);

    if (smsError) {
      console.error('Error fetching older SMS:', smsError);
    }

    // Process calls
    const processedCalls = await Promise.all(
      (olderCalls || []).map(async (call: CallHistoryRecord) => {
        try {
          const participantName = formatPhoneNumber(call.phone_number); // Use formatted phone number instead of participant identity

          const processedTranscript = call.transcription?.map((entry: any) => {
            let content = '';
            if (Array.isArray(entry.content)) {
              content = entry.content.join(' ').trim();
            } else if (typeof entry.content === 'string') {
              content = entry.content;
            } else {
              content = String(entry.content || '');
            }

            return {
              speaker: entry.role === 'user' ? 'Customer' : entry.role === 'assistant' ? 'Agent' : entry.role,
              time: format(new Date(call.start_time), 'HH:mm'),
              text: content
            };
          }) || [];

          // Recording is fetched on-demand in MessageBubble via useRecording (like voiceagents)

          return {
            id: call.id,
            name: participantName,
            phoneNumber: call.phone_number,
            date: format(new Date(call.start_time), 'yyyy-MM-dd'),
            time: format(new Date(call.start_time), 'HH:mm'),
            duration: formatDuration(call.call_duration),
            direction: 'inbound' as const,
            channel: 'voice' as const,
            tags: [],
            status: call.call_status,
            resolution: determineCallResolution(call.transcription, call.call_status, call.call_outcome, call.outcome_confidence),
            call_recording: '',
            summary: call.call_summary,
            transcript: processedTranscript,
            analysis: null,
            address: '',
            messages: [],
            phone_number: call.phone_number,
            call_outcome: determineCallResolution(call.transcription, call.call_status, call.call_outcome, call.outcome_confidence),
            created_at: call.start_time,
            call_sid: (call as any).call_sid,
            recording_info: null,
            assistant_id: call.assistant_id
          };
        } catch (error) {
          console.error('Error processing older call:', call.id, error);
          return null;
        }
      })
    );

    // Process SMS messages
    const processedSMS: SMSMessage[] = (olderSMS || []).map(sms => ({
      messageSid: sms.message_sid,
      to: sms.to_number,
      from: sms.from_number,
      body: sms.body,
      direction: sms.direction as 'inbound' | 'outbound',
      status: sms.status,
      dateCreated: sms.date_created,
      dateSent: sms.date_sent,
      dateUpdated: sms.date_updated,
      errorCode: sms.error_code,
      errorMessage: sms.error_message,
      numSegments: sms.num_segments,
      price: sms.price,
      priceUnit: sms.price_unit
    }));

    // Filter to ensure only calls from user's assistants are included (defensive check)
    const validCalls = processedCalls
      .filter(Boolean)
      .filter((call) => call.assistant_id && assistantIds.includes(call.assistant_id));
    const hasMoreHistory = validCalls.length === limit || processedSMS.length === limit;

    console.log(`📜 Loaded ${validCalls.length} older calls and ${processedSMS.length} older SMS messages`);

    return {
      calls: validCalls,
      smsMessages: processedSMS,
      hasMoreHistory,
      nextOffset: offset + limit
    };

  } catch (error) {
    console.error('Error loading conversation history:', error);
    throw error;
  }
};

/**
 * Fetch new messages since a specific timestamp for a phone number
 */
export const fetchNewMessagesSince = async (
  phoneNumber: string,
  sinceTimestamp: string,
  assistantIds: string[] = []
): Promise<{
  newSMSMessages: SMSMessage[];
  newCalls: any[];
  hasNewData: boolean;
}> => {
  try {
    const userId = await getCurrentUserIdAsync();
    const effectiveAssistantIds = assistantIds.length > 0 ? assistantIds : await getUserAssistantIds();

    console.log(`🔄 Fetching new messages for ${phoneNumber} since ${sinceTimestamp} for user ID: ${userId} with assistants:`, effectiveAssistantIds);

    if (effectiveAssistantIds.length === 0) {
      console.log('No assistants found for user, returning empty new messages');
      return {
        newSMSMessages: [],
        newCalls: [],
        hasNewData: false
      };
    }

    // Fetch new SMS messages
    let newSMSMessages: SMSMessage[] = [];
    try {
      const { data: smsData, error: smsError } = await supabase
        .from('sms_messages')
        .select('*')
        .or(`from_number.eq.${phoneNumber},to_number.eq.${phoneNumber}`)
        .eq('user_id', userId)
        .gt('date_created', sinceTimestamp)
        .order('date_created', { ascending: true });

      if (smsError) {
        console.warn('⚠️ Error fetching new SMS messages:', smsError.message);
      } else {
        newSMSMessages = (smsData || []).map(sms => ({
          messageSid: sms.message_sid,
          to: sms.to_number,
          from: sms.from_number,
          body: sms.body,
          direction: sms.direction as 'inbound' | 'outbound',
          status: sms.status,
          dateCreated: sms.date_created,
          dateSent: sms.date_sent,
          dateUpdated: sms.date_updated,
          errorCode: sms.error_code,
          errorMessage: sms.error_message,
          numSegments: sms.num_segments,
          price: sms.price,
          priceUnit: sms.price_unit
        }));
      }
    } catch (error) {
      console.warn('⚠️ Error fetching new SMS messages:', error);
    }

    // Fetch new calls
    let newCalls: any[] = [];
    try {
      const { data: callData, error: callError } = await supabase
        .from('call_history')
        .select('*')
        .eq('phone_number', phoneNumber)
        .in('assistant_id', effectiveAssistantIds)
        .gt('start_time', sinceTimestamp)
        .order('start_time', { ascending: true });

      if (callError) {
        console.warn('⚠️ Error fetching new calls:', callError.message);
      } else {
        newCalls = await Promise.all(
          (callData || []).map(async (call: CallHistoryRecord) => {
            try {
              const participantName = formatPhoneNumber(call.phone_number); // Use formatted phone number instead of participant identity

              // Process transcription data
              const processedTranscript = call.transcription?.map((entry: any) => {
                let content = '';
                if (Array.isArray(entry.content)) {
                  content = entry.content.join(' ').trim();
                } else if (typeof entry.content === 'string') {
                  content = entry.content;
                } else {
                  content = String(entry.content || '');
                }

                return {
                  speaker: entry.role === 'user' ? 'Customer' : entry.role === 'assistant' ? 'Agent' : entry.role,
                  time: format(new Date(call.start_time), 'HH:mm'),
                  text: content
                };
              }) || [];

              // Recording is fetched on-demand in MessageBubble via useRecording (like voiceagents)

              return {
                id: call.id,
                name: participantName,
                phoneNumber: call.phone_number,
                date: format(new Date(call.start_time), 'yyyy-MM-dd'),
                time: format(new Date(call.start_time), 'HH:mm'),
                duration: formatDuration(call.call_duration),
                direction: 'inbound' as const,
                channel: 'voice' as const,
                tags: [],
                status: call.call_status,
                resolution: determineCallResolution(call.transcription, call.call_status, call.call_outcome, call.outcome_confidence),
                call_recording: '',
                summary: call.call_summary,
                transcript: processedTranscript,
                analysis: null,
                address: '',
                messages: [],
                phone_number: call.phone_number,
                call_outcome: determineCallResolution(call.transcription, call.call_status, call.call_outcome, call.outcome_confidence),
                created_at: call.start_time,
                call_sid: (call as any).call_sid,
                recording_info: null,
                assistant_id: call.assistant_id
              };
            } catch (error) {
              console.error('Error processing new call:', call.id, error);
              return null;
            }
          })
        );
        // Filter to ensure only calls from user's assistants are included (defensive check)
        newCalls = newCalls
          .filter(Boolean)
          .filter((call) => call.assistant_id && effectiveAssistantIds.includes(call.assistant_id));
      }
    } catch (error) {
      console.warn('⚠️ Error fetching new calls:', error);
    }

    const hasNewData = newSMSMessages.length > 0 || newCalls.length > 0;

    console.log(`🔄 Found ${newSMSMessages.length} new SMS messages and ${newCalls.length} new calls for ${phoneNumber}`);

    return {
      newSMSMessages,
      newCalls,
      hasNewData
    };

  } catch (error) {
    console.error('Error fetching new messages:', error);
    return {
      newSMSMessages: [],
      newCalls: [],
      hasNewData: false
    };
  }
};

/**
 * Get conversations using the new progressive loading approach
 * This is the recommended way to fetch conversations for better performance
 */
export const getConversationsProgressive = async (assistantIds: string[] = []): Promise<{
  contacts: ContactSummary[];
  getConversationDetails: (phoneNumber: string, days?: number) => Promise<ConversationDetailsResponse>;
  loadMoreHistory: (phoneNumber: string, offset?: number, limit?: number) => Promise<LoadMoreHistoryResponse>;
  fetchNewMessagesSince: (phoneNumber: string, sinceTimestamp: string) => Promise<{
    newSMSMessages: SMSMessage[];
    newCalls: any[];
    hasNewData: boolean;
  }>;
}> => {
  try {
    console.log('🚀 Using progressive loading approach for conversations with filtered assistants:', assistantIds);

    // Fetch contact list first
    const contacts = await fetchContactList(50, assistantIds);

    return {
      contacts,
      getConversationDetails: (phoneNumber, days) => fetchConversationDetails(phoneNumber, days, assistantIds),
      loadMoreHistory: (phoneNumber, offset, limit) => loadConversationHistory(phoneNumber, offset, limit),
      fetchNewMessagesSince: (phoneNumber, sinceTimestamp) => fetchNewMessagesSince(phoneNumber, sinceTimestamp, assistantIds)
    };
  } catch (error) {
    console.error('Error in progressive conversations loading:', error);
    throw error;
  }
};

/**
 * Format duration in seconds to MM:SS format
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate total duration for all calls in a conversation
 */
function calculateTotalDuration(calls: any[]): string {
  const totalSeconds = calls.reduce((total, call) => {
    const [minutes, seconds] = call.duration.split(':').map(Number);
    return total + (minutes * 60) + seconds;
  }, 0);

  return formatDuration(totalSeconds);
}

/**
 * Determine call resolution - just return whatever is in the database
 */
function determineCallResolution(
  transcription: Array<{ role: string; content: any }>,
  status: string,
  aiOutcome?: string,
  aiConfidence?: number
): string {
  // Just return the status from the database as-is
  return status || 'Unknown';
}

/**
 * Generate call summary from transcription
 */
function generateCallSummary(transcription: Array<{ role: string; content: any }>): string {
  if (!transcription || transcription.length === 0) {
    return 'No conversation recorded';
  }

  // Safely extract content from transcription
  const extractContent = (t: { role: string; content: any }): string => {
    if (typeof t.content === 'string') {
      return t.content;
    } else if (typeof t.content === 'object' && t.content !== null) {
      if (typeof t.content.text === 'string') {
        return t.content.text;
      } else if (typeof t.content.message === 'string') {
        return t.content.message;
      } else if (Array.isArray(t.content)) {
        return t.content.join(' ');
      }
      return '';
    } else {
      return String(t.content || '');
    }
  };

  // Extract key points from transcription
  const customerMessages = transcription
    .filter(t => t.role === 'user' || t.role === 'customer')
    .map(extractContent)
    .join(' ');

  const agentMessages = transcription
    .filter(t => t.role === 'assistant' || t.role === 'agent')
    .map(extractContent)
    .join(' ');

  // Create a more comprehensive summary
  const summary = [];

  // Check for appointment/scheduling related content
  if (customerMessages.includes('appointment') || customerMessages.includes('schedule') || customerMessages.includes('book')) {
    summary.push('Customer interested in scheduling appointment');
  }

  // Check for service inquiries
  if (customerMessages.includes('window') || customerMessages.includes('replacement') || customerMessages.includes('door')) {
    summary.push('Customer inquired about window/door replacement services');
  }

  // Check for pricing inquiries
  if (customerMessages.includes('price') || customerMessages.includes('cost') || customerMessages.includes('quote')) {
    summary.push('Customer asked about pricing');
  }

  // Check for consultation requests
  if (customerMessages.includes('consultation') || customerMessages.includes('measure') || customerMessages.includes('estimate')) {
    summary.push('Customer requested consultation or estimate');
  }

  // Check agent responses
  if (agentMessages.includes('appointment') || agentMessages.includes('schedule')) {
    summary.push('Agent provided scheduling information');
  }

  if (agentMessages.includes('consultation') || agentMessages.includes('measure')) {
    summary.push('Agent offered free consultation');
  }

  // If no specific keywords found, try to create a summary from the first few messages
  if (summary.length === 0) {
    const allMessages = transcription.map(extractContent).filter(msg => msg.trim().length > 0);
    if (allMessages.length > 0) {
      // Take the first meaningful message and truncate it
      const firstMessage = allMessages[0];
      if (firstMessage.length > 50) {
        summary.push(firstMessage.substring(0, 50) + '...');
      } else {
        summary.push(firstMessage);
      }
    }
  }

  return summary.length > 0 ? summary.join('. ') + '.' : 'Call completed - no specific details available';
}
