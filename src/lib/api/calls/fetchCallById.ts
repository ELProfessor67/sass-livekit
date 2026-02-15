
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { Call, CallAnalysis } from "@/components/calls/types";
import { findCallInCache, addCallToCache, generateSpecificMockCall } from "../mockData/mockCallCache";
import { getCustomerName } from "@/utils/formatUtils";

// Fetch a single call by ID
export const fetchCallById = async (id: string) => {
  try {
    console.log(`Fetching call with ID: ${id}`);

    // First attempt to find in our mock cache
    const cachedCall = findCallInCache(id);
    if (cachedCall) {
      console.log(`Found call ${id} in mock cache`);
      return cachedCall;
    }

    // If not in cache, try Supabase
    const { data: call, error } = await supabase
      .from('call_history')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching call from Supabase:', error);
      throw error;
    }

    if (!call) {
      console.log(`Call with ID ${id} not found in Supabase, trying to generate mock call`);

      // Parse date from ID if possible
      let callDate = new Date();
      let callIndex = 0;

      const dateParts = id.match(/call-(\d{8})-(\d+)/);
      if (dateParts && dateParts.length === 3) {
        const dateStr = dateParts[1];
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1; // Months are 0-indexed
        const day = parseInt(dateStr.substring(6, 8));
        callDate = new Date(year, month, day);
        callIndex = parseInt(dateParts[2]);

        console.log(`Parsed date from ID: ${callDate.toISOString()}, index: ${callIndex}`);
      }

      // Generate a mock call with this specific ID
      const mockCall = generateSpecificMockCall(id, callDate, callIndex);
      if (mockCall) {
        // Cache this call for future reference
        addCallToCache('specific-calls', mockCall);

        console.log(`Generated specific mock call for ID: ${id}`);
        return mockCall;
      }

      throw new Error(`Call with ID ${id} not found`);
    }

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
      call_recording: (call as any).call_recording || ''
    } as Call;
  } catch (error) {
    console.error('Error in fetchCallById, falling back to mock data generation:', error);

    // Try to find in default mock calls as fallback
    const call = findCallInCache(id);
    if (call) {
      console.log(`Found call ${id} in mock data`);
      return call;
    }

    // Last resort: Try to generate a specific mock call for this ID
    console.log(`Attempting last resort mock generation for ID: ${id}`);

    // Parse date from ID if possible
    let callDate = new Date();
    let callIndex = 0;

    const dateParts = id.match(/call-(\d{8})-(\d+)/);
    if (dateParts && dateParts.length === 3) {
      const dateStr = dateParts[1];
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // Months are 0-indexed
      const day = parseInt(dateStr.substring(6, 8));
      callDate = new Date(year, month, day);
      callIndex = parseInt(dateParts[2]);

      console.log(`Last resort: Parsed date from ID: ${callDate.toISOString()}, index: ${callIndex}`);
    }

    // Generate a mock call with this specific ID
    const mockCall = generateSpecificMockCall(id, callDate, callIndex);
    if (mockCall) {
      // Cache this call for future reference
      addCallToCache('specific-calls', mockCall);

      console.log(`Generated specific mock call for ID: ${id}`);
      return mockCall;
    }

    // If we still can't find it, throw an error
    throw new Error(`Call with ID ${id} not found in any data source`);
  }
};
