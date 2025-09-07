
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { Call, CallAnalysis } from "@/components/calls/types";
import { getMockCalls } from "../mockData/mockCallCache";
import { fetchRecordingUrlCached } from "../recordings/fetchRecordingUrl";

// Fetch calls from Supabase with fallback to our mock data generator
export const fetchCalls = async () => {
  try {
    // Try to fetch from Supabase first
    const { data: calls, error } = await supabase
      .from('call_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching calls:', error);
      throw error;
    }

    if (calls && calls.length > 0) {
      // Transform data for UI with proper type handling
      const transformedCalls = await Promise.all(calls.map(async call => {
        // Fetch recording info if call_sid exists
        const recordingInfo = call.call_sid ? await fetchRecordingUrlCached(call.call_sid) : null;
        
        return {
          id: call.id,
          first_name: call.first_name,
          last_name: call.last_name,
          name:
            (call.first_name && call.first_name !== "NA") || (call.last_name && call.last_name !== "NA")
              ? [call.first_name, call.last_name].filter(Boolean).join(" ")
              : "Unknown",
          phoneNumber: call.phone_number || '',
          date: call.created_at ? format(new Date(call.created_at), 'yyyy-MM-dd') : '',
          time: call.created_at ? format(new Date(call.created_at), 'HH:mm') : '',
          duration: call.duration || '00:00',
          direction: call.type || 'Inbound',
          channel: 'Phone',
          address: call.address || null,
          analysis: call.analysis as CallAnalysis || null,
          tags: [], // If you want to add tags later
          status: call.status || 'Completed',
          resolution: call.call_outcome,
          summary: call.summary,
          transcript: call.transcript,
          call_recording: recordingInfo?.recordingUrl || call.call_recording || '',
          call_sid: call.call_sid,
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
