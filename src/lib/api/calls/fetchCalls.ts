
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { Call, CallAnalysis } from "@/components/calls/types";
import { getMockCalls } from "../mockData/mockCallCache";
import { fetchRecordingUrlCached } from "../recordings/fetchRecordingUrl";
import { getCustomerName } from "@/utils/formatUtils";

// Fetch calls from Supabase with fallback to our mock data generator
export const fetchCalls = async () => {
  try {
    // Try to fetch from Supabase first
    const { data: calls, error } = await supabase
      .from('call_history')
      .select('*')
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching calls:', error);
      throw error;
    }

    if (calls && calls.length > 0) {
      // Transform data for UI with proper type handling
      const transformedCalls = await Promise.all(calls.map(async call => {
        // Fetch recording info if call_sid exists
        const recordingInfo = (call as any).call_sid ? await fetchRecordingUrlCached((call as any).call_sid) : null;

        return {
          id: call.id,
          first_name: (call as any).first_name || 'Unknown',
          last_name: (call as any).last_name || '',
          name: getCustomerName({ ...call, analysis: call.structured_data }),
          phoneNumber: call.phone_number || '',
          date: call.start_time ? format(new Date(call.start_time), 'yyyy-MM-dd') : '',
          time: call.start_time ? format(new Date(call.start_time), 'HH:mm') : '',
          duration: call.call_duration ? format(new Date(call.call_duration * 1000), 'mm:ss') : '00:00',
          direction: 'Inbound',
          channel: 'Phone',
          address: (call as any).address || null,
          analysis: (call.structured_data as unknown as CallAnalysis) || null,
          tags: [],
          status: call.call_status || 'Completed',
          resolution: call.call_outcome || call.call_status,
          summary: call.call_summary || '',
          transcript: call.transcription,
          call_recording: (recordingInfo as any)?.recordingUrl || '',
          call_sid: (call as any).call_sid,
          recording_info: recordingInfo
        };
      }));

      return {
        calls: transformedCalls as Call[],
        total: transformedCalls.length,
      };
    }

    // Fallback to mock data if no Supabase data or empty results
    console.log("No data from Supabase, falling back to mock data");
    return getMockCalls();
  } catch (error) {
    console.error('Error in fetchCalls, falling back to mock data:', error);
    return getMockCalls();
  }
};
