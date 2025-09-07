import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { Conversation } from "@/components/conversations/types";
import { fetchRecordingUrlCached, RecordingInfo } from "../recordings/fetchRecordingUrl";

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
export const fetchConversations = async (): Promise<ConversationsResponse> => {
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
            recording_info: recordingInfo
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
            lastActivityDate: '',
            lastActivityTime: '',
            lastActivityTimestamp: new Date(),
            lastCallOutcome: undefined,
            calls: [],
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

    // Convert map to array and sort by last activity
    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => b.lastActivityTimestamp.getTime() - a.lastActivityTimestamp.getTime());

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
