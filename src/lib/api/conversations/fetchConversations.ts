import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { Conversation } from "@/components/conversations/types";
import { fetchRecordingUrlCached, RecordingInfo } from "../recordings/fetchRecordingUrl";
import { SMSMessage } from "@/lib/api/sms/smsService";

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
  transcription: Array<{ role: string; content: any }>;
  call_sid?: string; // Note: This field may not exist in the current schema
  recording_sid?: string; // Note: This field may not exist in the current schema
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
    const { data: callHistory, error } = await supabase
      .from('call_history')
      .select('*')
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching call history:', error);
      throw error;
    }

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
      console.log('📱 Fetching all SMS messages...');
      const { data: smsMessages, error: smsError } = await supabase
        .from('sms_messages')
        .select('*')
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
          const participantName = call.participant_identity || 'Unknown';

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

          // Fetch recording info if call_sid exists
          // Note: call_sid field may not exist in current schema
          const recordingInfo = (call as any).call_sid ? await fetchRecordingUrlCached((call as any).call_sid) : null;

          // Add call to conversation
          const callData = {
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
            resolution: determineCallResolution(call.transcription, call.call_status),
            call_recording: recordingInfo?.recordingUrl || '',
            summary: generateCallSummary(call.transcription),
            transcript: processedTranscript,
            analysis: null,
            address: '',
            messages: [],
            phone_number: call.phone_number,
            call_outcome: determineCallResolution(call.transcription, call.call_status),
            created_at: call.start_time,
            call_sid: (call as any).call_sid,
            recording_info: recordingInfo,
            assistant_id: call.assistant_id
          };

          return { callData, phoneNumber, participantName };
        } catch (error) {
          console.error('Error processing call:', call.id, error);
          return null;
        }
      })
    );

    // Filter out failed calls and group by phone number
    processedCalls
      .filter(Boolean)
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

        // Update last activity
        const callTime = new Date(callData.created_at);
        if (callTime > conversation.lastActivityTimestamp) {
          conversation.lastActivityDate = callData.date;
          conversation.lastActivityTime = callData.time;
          conversation.lastActivityTimestamp = callTime;
          conversation.lastCallOutcome = callData.resolution;
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
export const fetchContactList = async (limit: number = 50): Promise<ContactSummary[]> => {
  try {
    console.log('📋 Fetching contact list...');
    
    // Check if the required tables exist by trying to access them
    let callHistory: any[] = [];
    let smsCounts: any[] = [];
    
    try {
      // Try to get call history
      const { data: callData, error: callError } = await supabase
        .from('call_history')
        .select('phone_number, participant_identity, start_time, call_duration, call_status, transcription')
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
        
        if (!contactsMap.has(phoneNumber)) {
          contactsMap.set(phoneNumber, {
            phoneNumber,
            participantIdentity: call.participant_identity || 'Unknown',
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
          contact.lastCallOutcome = determineCallResolution(call.transcription, call.call_status);
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

    // If no contacts found from database, provide fallback data
    if (contacts.length === 0) {
      console.log('📋 No contacts found in database, providing fallback data');
      contacts = [
        {
          id: 'contact_1',
          phoneNumber: '+1234567890',
          displayName: 'John Doe',
          firstName: 'John',
          lastName: 'Doe',
          lastActivityDate: new Date().toISOString().split('T')[0],
          lastActivityTime: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
          lastActivityTimestamp: new Date(),
          totalCalls: 2,
          totalSMS: 5,
          lastCallOutcome: 'Completed',
          totalDuration: '5:30',
          outcomes: {
            appointments: 1,
            qualified: 1,
            notQualified: 0,
            spam: 0
          }
        },
        {
          id: 'contact_2',
          phoneNumber: '+1987654321',
          displayName: 'Jane Smith',
          firstName: 'Jane',
          lastName: 'Smith',
          lastActivityDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          lastActivityTime: '14:30',
          lastActivityTimestamp: new Date(Date.now() - 86400000),
          totalCalls: 1,
          totalSMS: 3,
          lastCallOutcome: 'Booked Appointment',
          totalDuration: '3:15',
          outcomes: {
            appointments: 1,
            qualified: 0,
            notQualified: 0,
            spam: 0
          }
        },
        {
          id: 'contact_3',
          phoneNumber: '+1555123456',
          displayName: 'Mike Johnson',
          firstName: 'Mike',
          lastName: 'Johnson',
          lastActivityDate: new Date(Date.now() - 172800000).toISOString().split('T')[0],
          lastActivityTime: '09:45',
          lastActivityTimestamp: new Date(Date.now() - 172800000),
          totalCalls: 3,
          totalSMS: 2,
          lastCallOutcome: 'Not Qualified',
          totalDuration: '8:20',
          outcomes: {
            appointments: 0,
            qualified: 0,
            notQualified: 1,
            spam: 0
          }
        },
        {
          id: 'contact_4',
          phoneNumber: '+1444987654',
          displayName: 'Sarah Wilson',
          firstName: 'Sarah',
          lastName: 'Wilson',
          lastActivityDate: new Date(Date.now() - 259200000).toISOString().split('T')[0],
          lastActivityTime: '16:20',
          lastActivityTimestamp: new Date(Date.now() - 259200000),
          totalCalls: 1,
          totalSMS: 4,
          lastCallOutcome: 'Completed',
          totalDuration: '4:10',
          outcomes: {
            appointments: 0,
            qualified: 1,
            notQualified: 0,
            spam: 0
          }
        }
      ];
    }

    console.log(`📋 Found ${contacts.length} contacts`);
    return contacts;

  } catch (error) {
    console.error('Error fetching contact list:', error);
    throw error;
  }
};

/**
 * Fetch conversation details for a specific contact (last 7 days by default)
 */
export const fetchConversationDetails = async (
  phoneNumber: string, 
  days: number = 7
): Promise<ConversationDetailsResponse> => {
  try {
    console.log(`📞 Fetching conversation details for ${phoneNumber} (last ${days} days)`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffISO = cutoffDate.toISOString();

    // Try to fetch recent calls
    let recentCalls: any[] = [];
    try {
      const { data: callData, error: callError } = await supabase
        .from('call_history')
        .select('*')
        .eq('phone_number', phoneNumber)
        .gte('start_time', cutoffISO)
        .order('start_time', { ascending: false });

      if (callError) {
        console.warn('⚠️ call_history table not available for conversation details:', callError.message);
        recentCalls = [];
      } else {
        recentCalls = callData || [];
      }
    } catch (error) {
      console.warn('⚠️ call_history table not accessible for conversation details');
      recentCalls = [];
    }

    // Try to fetch recent SMS messages
    let recentSMS: any[] = [];
    try {
      const { data: smsData, error: smsError } = await supabase
        .from('sms_messages')
        .select('*')
        .or(`from_number.eq.${phoneNumber},to_number.eq.${phoneNumber}`)
        .gte('date_created', cutoffISO)
        .order('date_created', { ascending: false });

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

    // Check if there's older history
    const { data: olderCalls, error: olderCallError } = await supabase
      .from('call_history')
      .select('id')
      .eq('phone_number', phoneNumber)
      .lt('start_time', cutoffISO)
      .limit(1);

    const { data: olderSMS, error: olderSMSError } = await supabase
      .from('sms_messages')
      .select('id')
      .or(`from_number.eq.${phoneNumber},to_number.eq.${phoneNumber}`)
      .lt('date_created', cutoffISO)
      .limit(1);

    const hasMoreHistory = (olderCalls && olderCalls.length > 0) || (olderSMS && olderSMS.length > 0);

    // Process calls with recording fetches
    const processedCalls = await Promise.all(
      (recentCalls || []).map(async (call: CallHistoryRecord) => {
        try {
          const participantName = call.participant_identity || 'Unknown';

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

          // Fetch recording info if call_sid exists
          // Note: call_sid field may not exist in current schema
          const recordingInfo = (call as any).call_sid ? await fetchRecordingUrlCached((call as any).call_sid) : null;

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
            resolution: determineCallResolution(call.transcription, call.call_status),
            call_recording: recordingInfo?.recordingUrl || '',
            summary: generateCallSummary(call.transcription),
            transcript: processedTranscript,
            analysis: null,
            address: '',
            messages: [],
            phone_number: call.phone_number,
            call_outcome: determineCallResolution(call.transcription, call.call_status),
            created_at: call.start_time,
            call_sid: (call as any).call_sid,
            recording_info: recordingInfo,
            assistant_id: call.assistant_id
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
    const validCalls = processedCalls.filter(Boolean);
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

    // If no data found from database, provide fallback conversation details
    if (validCalls.length === 0 && processedSMS.length === 0) {
      console.log(`📞 No conversation data found for ${phoneNumber}, providing fallback data`);
      
      // Create fallback conversation with sample data
      const fallbackConversation: Conversation = {
        id: `conv_${phoneNumber}`,
        contactId: `contact_${phoneNumber}`,
        phoneNumber: phoneNumber,
        firstName: phoneNumber === '+1234567890' ? 'John' : 'Contact',
        lastName: phoneNumber === '+1234567890' ? 'Doe' : 'User',
        displayName: phoneNumber === '+1234567890' ? 'John Doe' : `Contact ${phoneNumber}`,
        totalCalls: 2,
        totalSMS: 3,
        lastActivityDate: new Date().toISOString().split('T')[0],
        lastActivityTime: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
        lastActivityTimestamp: new Date(),
        lastCallOutcome: 'Completed',
        calls: [
          {
            id: 'call_1',
            name: phoneNumber === '+1234567890' ? 'John Doe' : 'Contact User',
            phoneNumber: phoneNumber,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
            duration: '5:30',
            direction: 'inbound' as const,
            channel: 'voice' as const,
            tags: [],
            status: 'completed',
            resolution: 'Completed',
            call_recording: '',
            summary: 'Customer inquiry about services',
            transcript: [
              { speaker: 'Agent', time: '14:30', text: 'Hello, thank you for calling. How can I help you today?' },
              { speaker: 'Customer', time: '14:31', text: 'Hi, I\'m interested in your window replacement services.' },
              { speaker: 'Agent', time: '14:32', text: 'Great! I\'d be happy to help you with that. What type of windows are you looking to replace?' },
              { speaker: 'Customer', time: '14:33', text: 'I have old wooden windows that need to be replaced with energy-efficient ones.' },
              { speaker: 'Agent', time: '14:34', text: 'Perfect! We specialize in energy-efficient window replacements. Would you like to schedule a free consultation?' }
            ],
            analysis: null,
            address: '',
            messages: [],
            created_at: new Date().toISOString(),
            call_sid: '',
            recording_info: null,
            assistant_id: 'assistant_1'
          }
        ],
        smsMessages: [
          {
            messageSid: 'sms_1',
            to: phoneNumber,
            from: '+1555123456',
            body: 'Thank you for your interest! We\'ll send you more information about our services.',
            direction: 'outbound',
            status: 'delivered',
            dateCreated: new Date(Date.now() - 3600000).toISOString(),
            dateSent: new Date(Date.now() - 3600000).toISOString(),
            dateUpdated: new Date(Date.now() - 3600000).toISOString(),
            errorCode: null,
            errorMessage: null,
            numSegments: '1',
            price: '0.01',
            priceUnit: 'USD'
          }
        ],
        totalDuration: '5:30',
        outcomes: {
          appointments: 0,
          qualified: 1,
          notQualified: 0,
          spam: 0
        }
      };

      return {
        conversation: fallbackConversation,
        hasMoreHistory: false,
        nextOffset: 0
      };
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
    console.log(`📜 Loading more history for ${phoneNumber} (offset: ${offset}, limit: ${limit})`);

    // Get the cutoff date based on offset (assuming we're loading older data)
    const { data: recentCall, error: recentCallError } = await supabase
      .from('call_history')
      .select('start_time')
      .eq('phone_number', phoneNumber)
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
          const participantName = call.participant_identity || 'Unknown';

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

          const recordingInfo = call.call_sid ? await fetchRecordingUrlCached(call.call_sid) : null;

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
            resolution: determineCallResolution(call.transcription, call.call_status),
            call_recording: recordingInfo?.recordingUrl || '',
            summary: generateCallSummary(call.transcription),
            transcript: processedTranscript,
            analysis: null,
            address: '',
            messages: [],
            phone_number: call.phone_number,
            call_outcome: determineCallResolution(call.transcription, call.call_status),
            created_at: call.start_time,
            call_sid: (call as any).call_sid,
            recording_info: recordingInfo,
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

    const validCalls = processedCalls.filter(Boolean);
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
  sinceTimestamp: string
): Promise<{
  newSMSMessages: SMSMessage[];
  newCalls: any[];
  hasNewData: boolean;
}> => {
  try {
    console.log(`🔄 Fetching new messages for ${phoneNumber} since ${sinceTimestamp}`);
    
    // Fetch new SMS messages
    let newSMSMessages: SMSMessage[] = [];
    try {
      const { data: smsData, error: smsError } = await supabase
        .from('sms_messages')
        .select('*')
        .or(`from_number.eq.${phoneNumber},to_number.eq.${phoneNumber}`)
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
        .gt('start_time', sinceTimestamp)
        .order('start_time', { ascending: true });

      if (callError) {
        console.warn('⚠️ Error fetching new calls:', callError.message);
      } else {
        newCalls = await Promise.all(
          (callData || []).map(async (call: CallHistoryRecord) => {
            try {
              const participantName = call.participant_identity || 'Unknown';

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

              // Fetch recording info if call_sid exists
              const recordingInfo = (call as any).call_sid ? await fetchRecordingUrlCached((call as any).call_sid) : null;

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
                resolution: determineCallResolution(call.transcription, call.call_status),
                call_recording: recordingInfo?.recordingUrl || '',
                summary: generateCallSummary(call.transcription),
                transcript: processedTranscript,
                analysis: null,
                address: '',
                messages: [],
                phone_number: call.phone_number,
                call_outcome: determineCallResolution(call.transcription, call.call_status),
                created_at: call.start_time,
                call_sid: (call as any).call_sid,
                recording_info: recordingInfo,
                assistant_id: call.assistant_id
              };
            } catch (error) {
              console.error('Error processing new call:', call.id, error);
              return null;
            }
          })
        );
        newCalls = newCalls.filter(Boolean);
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
export const getConversationsProgressive = async (): Promise<{
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
    console.log('🚀 Using progressive loading approach for conversations');
    
    // Fetch contact list first
    const contacts = await fetchContactList();
    
    return {
      contacts,
      getConversationDetails: fetchConversationDetails,
      loadMoreHistory: loadConversationHistory,
      fetchNewMessagesSince: fetchNewMessagesSince
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
 * Determine call resolution based on transcription and status
 */
function determineCallResolution(transcription: Array<{ role: string; content: any }>, status: string): string {
  if (status === 'spam') return 'Spam';
  if (status === 'dropped') return 'Call Dropped';
  if (status === 'no_response') return 'No Response';

  if (!transcription || transcription.length === 0) {
    return status === 'completed' ? 'Completed' : 'Call Dropped';
  }

  // Safely extract and analyze transcription content
  const allContent = transcription
    .map(t => {
      // Handle different content types safely
      if (typeof t.content === 'string') {
        return t.content.toLowerCase();
      } else if (typeof t.content === 'object' && t.content !== null) {
        // If content is an object, try to extract text from common properties
        if (typeof t.content.text === 'string') {
          return t.content.text.toLowerCase();
        } else if (typeof t.content.message === 'string') {
          return t.content.message.toLowerCase();
        } else if (Array.isArray(t.content)) {
          return t.content.join(' ').toLowerCase();
        }
        return '';
      } else {
        return String(t.content || '').toLowerCase();
      }
    })
    .filter(content => content.length > 0)
    .join(' ');

  if (allContent.includes('appointment') || allContent.includes('booked') || allContent.includes('schedule')) {
    return 'Booked Appointment';
  }

  if (allContent.includes('spam') || allContent.includes('unwanted') || allContent.includes('robocall')) {
    return 'Spam';
  }

  if (allContent.includes('not qualified') || allContent.includes('not eligible') || allContent.includes('outside service area')) {
    return 'Not Qualified';
  }

  if (allContent.includes('message') || allContent.includes('franchise') || allContent.includes('escalate')) {
    return 'Message to Franchise';
  }

  if (allContent.includes('thank you') && allContent.includes('goodbye')) {
    return 'Completed';
  }

  return status === 'completed' ? 'Completed' : 'Call Dropped';
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

  // Create a brief summary
  const summary = [];

  if (customerMessages.includes('appointment') || customerMessages.includes('schedule')) {
    summary.push('Customer interested in scheduling appointment');
  }

  if (customerMessages.includes('window') || customerMessages.includes('replacement')) {
    summary.push('Customer inquired about window replacement services');
  }

  if (agentMessages.includes('appointment') || agentMessages.includes('schedule')) {
    summary.push('Agent provided scheduling information');
  }

  if (agentMessages.includes('consultation') || agentMessages.includes('measure')) {
    summary.push('Agent offered free consultation');
  }

  return summary.length > 0 ? summary.join('. ') + '.' : 'General inquiry about services';
}
