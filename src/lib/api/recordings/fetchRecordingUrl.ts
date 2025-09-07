import { supabase } from "@/integrations/supabase/client";

export interface RecordingInfo {
  recordingSid: string;
  recordingUrl: string;
  recordingStatus: string;
  recordingDuration: number;
  recordingChannels: number;
  recordingStartTime: string;
  recordingSource: string;
  recordingTrack: string;
}

export interface TwilioRecordingResponse {
  success: boolean;
  call: {
    sid: string;
    status: string;
    direction: string;
    from: string;
    to: string;
    startTime: string;
    endTime: string;
    duration: string;
  };
  recordings: Array<{
    sid: string;
    status: string;
    duration: string;
    channels: number;
    source: string;
    startTime: string;
    url: string;
  }>;
}

/**
 * Fetch recording URL from Twilio using call_sid
 */
export const fetchRecordingUrl = async (callSid: string): Promise<RecordingInfo | null> => {
  try {
    if (!callSid) {
      console.warn('No call_sid provided for recording fetch');
      return null;
    }

    // Get Twilio credentials from the server
    const { data: credentials, error: credError } = await supabase
      .from('user_twilio_credentials')
      .select('account_sid, auth_token')
      .eq('is_active', true)
      .single();

    if (credError || !credentials) {
      console.error('Failed to fetch Twilio credentials:', credError);
      return null;
    }

    // Call our server API to get recording info from Twilio
    const response = await fetch(
      `/api/v1/call/${callSid}/recordings?accountSid=${credentials.account_sid}&authToken=${credentials.auth_token}`
    );

    if (!response.ok) {
      console.error('Failed to fetch recording from Twilio:', response.status, response.statusText);
      return null;
    }

    const data: TwilioRecordingResponse = await response.json();

    if (!data.success || !data.recordings || data.recordings.length === 0) {
      console.warn('No recordings found for call:', callSid);
      return null;
    }

    // Get the first (and usually only) recording
    const recording = data.recordings[0];

    // Use our proxy endpoint instead of direct Twilio API access
    // This avoids CORS and authentication issues
    const proxyAudioUrl = `/api/v1/recording/${recording.sid}/audio?accountSid=${credentials.account_sid}&authToken=${credentials.auth_token}`;

    return {
      recordingSid: recording.sid,
      recordingUrl: proxyAudioUrl,
      recordingStatus: recording.status,
      recordingDuration: parseInt(recording.duration) || 0,
      recordingChannels: recording.channels || 2,
      recordingStartTime: recording.startTime,
      recordingSource: recording.source,
      recordingTrack: 'both' // Default for dual recording
    };

  } catch (error) {
    console.error('Error fetching recording URL:', error);
    return null;
  }
};

/**
 * Fetch recording URL with caching to avoid repeated API calls
 */
const recordingCache = new Map<string, RecordingInfo | null>();

export const fetchRecordingUrlCached = async (callSid: string): Promise<RecordingInfo | null> => {
  // Check cache first
  if (recordingCache.has(callSid)) {
    return recordingCache.get(callSid) || null;
  }

  // Fetch from API
  const recording = await fetchRecordingUrl(callSid);
  
  // Cache the result (even if null to avoid repeated failed requests)
  recordingCache.set(callSid, recording);
  
  return recording;
};
