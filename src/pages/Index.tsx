
import { useState, useMemo } from "react";
import { useBusinessUseCase } from "@/components/BusinessUseCaseProvider";
import { mockApi } from "@/lib/api";
import { mapCallsToUseCase, calculateUseCaseMetrics } from "@/utils/dataMapping";
import DashboardLayout from "@/layout/DashboardLayout";
import FilterBar from "@/components/navigation/FilterBar";
import DashboardContent from "@/components/dashboard/DashboardContent";
import { differenceInDays } from "date-fns";

export default function Index() {
  const { config } = useBusinessUseCase();
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });

  // Generate enhanced mock data specifically for the selected date range
  const mockCalls = useMemo(() => {
    // Calculate days in range
    const daysInRange = differenceInDays(dateRange.to, dateRange.from) + 1;
    
    // For a 30-day range, generate exactly 94 calls
    const baseCallCount = 94;
    
    // Generate calls with the specific parameters for the date range
    const baseCalls = mockApi.generateCalls(baseCallCount, dateRange);
    
    // Map the calls to the current use case context
    return mapCallsToUseCase(baseCalls, config);
  }, [dateRange.from, dateRange.to, config]);
  
  // All calls are already filtered for the date range in the generator
  const callLogs = mockCalls;

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
        isLoading={false}
        stats={stats}
        callOutcomesData={callOutcomesData}
      />
    </DashboardLayout>
  );
}
