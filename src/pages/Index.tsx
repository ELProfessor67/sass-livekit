
import { useState, useMemo, useEffect } from "react";
import { useBusinessUseCase } from "@/components/BusinessUseCaseProvider";
import { calculateUseCaseMetrics } from "@/utils/dataMapping";
import DashboardLayout from "@/layout/DashboardLayout";
import FilterBar from "@/components/navigation/FilterBar";
import DashboardContent from "@/components/dashboard/DashboardContent";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouteChangeData } from "@/hooks/useRouteChange";

interface CallHistory {
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
  created_at: string;
}

export default function Index() {
  const { config } = useBusinessUseCase();
  const { user, loading: isAuthLoading } = useAuth();
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [realCallHistory, setRealCallHistory] = useState<CallHistory[]>([]);
  const [isLoadingRealData, setIsLoadingRealData] = useState(true);

  // Helper function to determine call outcome from transcription
  const getCallOutcome = (transcription: Array<{ role: string; content: any }>) => {
    if (!transcription || transcription.length === 0) return 'No Outcome';

    const lastMessage = transcription[transcription.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      // Safely convert content to string and handle different data types
      const content = typeof lastMessage.content === 'string'
        ? lastMessage.content.toLowerCase()
        : String(lastMessage.content || '').toLowerCase();

      if (content.includes('appointment') || content.includes('booked')) return 'Booked Appointment';
      if (content.includes('spam')) return 'Spam';
      if (content.includes('not qualified')) return 'Not Qualified';
      if (content.includes('message')) return 'Message to Franchise';
    }

    return 'Call Dropped';
  };

  // Fetch real call history from Supabase
  const fetchCallHistory = async () => {
    // Don't fetch data if auth is still loading or user is not authenticated
    if (isAuthLoading || !user?.id) {
      setIsLoadingRealData(false);
      return;
    }

    try {
      setIsLoadingRealData(true);
      const { data, error } = await supabase
        .from('call_history')
        .select('*')
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching call history:', error);
        return;
      }

      setRealCallHistory(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoadingRealData(false);
    }
  };

  useEffect(() => {
    fetchCallHistory();
  }, [isAuthLoading, user?.id]);

  // Trigger API call on route changes
  useRouteChangeData(fetchCallHistory, [isAuthLoading, user?.id], {
    enabled: !isAuthLoading && !!user?.id,
    refetchOnRouteChange: true
  });

  // Convert real call history to the format expected by the dashboard
  const realCallLogs = useMemo(() => {
    return realCallHistory.map(call => {
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
          time: new Date(call.start_time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }),
          text: content
        };
      }) || [];

      return {
        id: call.id,
        name: call.participant_identity || 'Unknown',
        phoneNumber: call.phone_number || '',
        date: new Date(call.start_time).toLocaleDateString('en-US'),
        time: new Date(call.start_time).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        duration: `${Math.floor(call.call_duration / 60)}:${(call.call_duration % 60).toString().padStart(2, '0')}`,
        direction: 'inbound',
        channel: 'voice',
        tags: [],
        status: call.call_status,
        resolution: getCallOutcome(call.transcription),
        call_recording: '',
        summary: '',
        transcript: processedTranscript,
        analysis: null,
        address: '',
        messages: [],
        phone_number: call.phone_number || '',
        call_outcome: getCallOutcome(call.transcription),
        created_at: call.start_time
      };
    });
  }, [realCallHistory]);

  // Use only real data from Supabase
  const callLogs = realCallLogs;

  // Calculate use case specific statistics
  const stats = useMemo(() => {
    return calculateUseCaseMetrics(callLogs, config);
  }, [callLogs, config]);

  const handleRangeChange = (range) => {
    setDateRange(range);
  };

  // Process call outcomes using the dynamic use case configuration
  const callOutcomesData = useMemo(() => {
    return callLogs.reduce((acc, call) => {
      const resolution = call.resolution?.toLowerCase() || '';

      // Find matching outcome in current use case config
      const matchingOutcome = config.outcomes.find(outcome =>
        resolution === outcome.key.toLowerCase() ||
        resolution.includes(outcome.key.toLowerCase())
      );

      const outcomeKey = matchingOutcome?.key || resolution;
      acc[outcomeKey] = (acc[outcomeKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [callLogs, config]);

  // Ensure each call has the required fields for display with proper resolution mapping
  const processedCallLogs = callLogs.map(call => ({
    ...call,
    phone_number: call.phoneNumber || '',
    call_outcome: call.resolution || null,
    created_at: `${call.date}T${call.time || '00:00'}`
  }));

  return (
    <DashboardLayout>
      <div className="relative">
        <FilterBar onRangeChange={handleRangeChange} />
      </div>
      <DashboardContent
        dateRange={dateRange}
        callLogs={processedCallLogs}
        isLoading={isAuthLoading || isLoadingRealData}
        stats={stats}
        callOutcomesData={callOutcomesData}
      />
    </DashboardLayout>
  );
}
