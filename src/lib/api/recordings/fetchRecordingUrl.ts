import { supabase } from "@/integrations/supabase/client";
import { TwilioCredentialsService } from "@/lib/twilio-credentials";

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
 * Fetch recording URL from Twilio using call_sid (exactly like voiceagents)
 */
export const fetchRecordingUrl = async (callSid: string): Promise<RecordingInfo | null> => {
  try {
    if (!callSid) {
      console.warn('No call_sid provided for recording fetch');
      return null;
    }

    // Get the current session token from Supabase (like voiceagents)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.error('No authentication token available');
      return null;
    }

    // Get Twilio credentials using the service (like voiceagents approach)
    const credentials = await TwilioCredentialsService.getActiveCredentials();

    if (!credentials) {
      console.error('Failed to fetch Twilio credentials');
      return null;
    }

    // Debug: Log credential lengths to check for truncation
    console.log('Credentials debug:', {
      accountSid: credentials.account_sid,
      accountSidLength: credentials.account_sid?.length,
      authTokenLength: credentials.auth_token?.length,
      authTokenPreview: credentials.auth_token?.substring(0, 10) + '...'
    });

    // Call our server API to get recording info from Twilio (like voiceagents)
    console.log('Fetching recording for callSid:', callSid);
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'}/api/v1/call/${callSid}/recordings?accountSid=${encodeURIComponent(credentials.account_sid)}&authToken=${encodeURIComponent(credentials.auth_token)}`
    );

    console.log('Recording API response status:', response.status);

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

    // Use our proxy endpoint instead of direct Twilio API access (like voiceagents)
    // This avoids CORS and authentication issues
    const proxyAudioUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'}/api/v1/call/recording/${recording.sid}/audio?accountSid=${encodeURIComponent(credentials.account_sid)}&authToken=${encodeURIComponent(credentials.auth_token)}`;
    
    console.log('Proxy audio URL length:', proxyAudioUrl.length);
    console.log('Proxy audio URL preview:', proxyAudioUrl.substring(0, 100) + '...');

    return {
      recordingSid: recording.sid,
      recordingUrl: proxyAudioUrl,
      recordingStatus: recording.status,
      recordingDuration: parseInt(recording.duration) || 0,
      recordingChannels: recording.channels || 2,
      recordingStartTime: recording.startTime,
      recordingSource: recording.source,
      recordingTrack: 'both' // Default for dual recording (like voiceagents)
    };

  } catch (error) {
    console.error('Error fetching recording URL:', error);
    return null;
  }
};

/**
 * Fetch recording URL with caching to avoid repeated API calls (exactly like voiceagents)
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
