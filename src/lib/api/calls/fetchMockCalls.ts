import { generateCalls } from "../mockData/generator";
import { getMockCallCacheKey, getMockCallsFromCache, cacheMockCalls } from "../mockData/mockCallCache";

// Get a stable key for the date range to use in caching
export const getDateRangeKey = (dateRange?: { from: Date; to: Date }) => {
  if (!dateRange) return 'default-30days';
  return `${dateRange.from.toISOString().split('T')[0]}-to-${dateRange.to.toISOString().split('T')[0]}`;
};

// Generate mock call data with date range support
export const fetchMockCalls = (dateRange?: { from: Date; to: Date }) => {
  const rangeKey = getDateRangeKey(dateRange);
  
  // Check if we already have generated calls for this date range
  const cachedCalls = getMockCallsFromCache(rangeKey);
  if (cachedCalls) {
    console.log(`Using cached mock calls for range: ${rangeKey}`);
    return {
      calls: cachedCalls,
      total: cachedCalls.length,
    };
  }
  
  const endDate = dateRange?.to || new Date();
  const startDate = dateRange?.from || new Date(endDate);
  startDate.setDate(startDate.getDate() - 30); // Default to 30 days if no range specified
  
  console.log(`Generating mock calls from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  // Generate calls with the specific date range - keep a consistent call count for better UX
  const calls = generateCalls(94, { from: startDate, to: endDate });
  
  console.log(`Generated ${calls.length} mock calls`);
  
  // Cache the generated calls for this date range
  cacheMockCalls(rangeKey, calls);
  
  return {
    calls,
    total: calls.length,
  };
};
