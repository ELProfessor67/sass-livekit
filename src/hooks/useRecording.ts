import { useState, useEffect } from 'react';
import { fetchRecordingUrlCached, RecordingInfo } from '@/lib/api/recordings/fetchRecordingUrl';

export function useRecording(callSid: string | undefined) {
  const [recording, setRecording] = useState<RecordingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!callSid) {
      setRecording(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchRecording = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const recordingInfo = await fetchRecordingUrlCached(callSid);
        setRecording(recordingInfo);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch recording');
        setRecording(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRecording();
  }, [callSid]);

  return {
    recording,
    loading,
    error,
    hasRecording: !!recording?.recordingUrl
  };
}

