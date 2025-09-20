import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { Conversation } from "@/components/conversations/types";
import { fetchRecordingUrlCached, RecordingInfo } from "../recordings/fetchRecordingUrl";
import { SMSMessage } from "@/lib/api/sms/smsService";

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
  call_sid?: string;
  recording_sid?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
}

/**
 * Fetch conversations from call_history table
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
            direction: sms.direction,
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
          const recordingInfo = call.call_sid ? await fetchRecordingUrlCached(call.call_sid) : null;

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
            call_sid: call.call_sid,
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
