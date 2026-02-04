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
 * Fetch recording URL from Twilio using call_sid (like voiceagents: Bearer auth only, no query params)
 */
export const fetchRecordingUrl = async (callSid: string): Promise<RecordingInfo | null> => {
  try {
    if (!callSid) {
      console.warn('No call_sid provided for recording fetch');
      return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error('No authentication token available');
      return null;
    }

    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
    const response = await fetch(`${baseUrl}/api/v1/calls/${callSid}/recordings`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch recording from Twilio:', response.status, response.statusText);
      return null;
    }

    const data: TwilioRecordingResponse = await response.json();
    if (!data.success || !data.recordings || data.recordings.length === 0) {
      console.warn('No recordings found for call:', callSid);
      return null;
    }

    const recording = data.recordings[0];
    const recordingSid = encodeURIComponent(recording.sid);
    const proxyAudioUrl = `${baseUrl}/api/v1/calls/recording/${recordingSid}/audio`;

    return {
      recordingSid: recording.sid,
      recordingUrl: proxyAudioUrl,
      recordingStatus: recording.status,
      recordingDuration: parseInt(recording.duration) || 0,
      recordingChannels: recording.channels || 2,
      recordingStartTime: recording.startTime,
      recordingSource: recording.source,
      recordingTrack: 'both'
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
