import { BusinessUseCaseConfig } from "@/types/businessUseCase";
import { Call } from "@/components/calls/types";

// Map raw call data to use case specific outcomes
export const mapCallsToUseCase = (calls: Call[], config: BusinessUseCaseConfig): Call[] => {
  return calls.map(call => {
    const rawResolution = call.resolution?.toLowerCase() || '';
    
    // Find matching outcome in the current use case config
    const matchingOutcome = config.outcomes.find(outcome => {
      const outcomeKey = outcome.key.toLowerCase();
      return rawResolution.includes(outcomeKey) || 
             outcomeKey.includes(rawResolution) ||
             mapLegacyResolution(rawResolution, outcome.key);
    });

    return {
      ...call,
      resolution: matchingOutcome?.key || rawResolution
    };
  });
};

// Map legacy resolution values to new use case specific ones
const mapLegacyResolution = (legacyResolution: string, outcomeKey: string): boolean => {
  const mappings: Record<string, string[]> = {
    'booked appointment': ['appointment', 'scheduled', 'booking'],
    'appointment': ['booked appointment', 'scheduled', 'booking'],
    'resolved': ['completed', 'successful', 'closed'],
    'not qualified': ['not eligible', 'unqualified', 'ineligible'],
    'escalated': ['message to franchisee', 'forwarded'],
    'interview scheduled': ['appointment', 'booked appointment', 'scheduled'],
    'order placed': ['completed', 'successful', 'purchase'],
    'quote requested': ['inquiry', 'interested']
  };

  const synonyms = mappings[outcomeKey] || [];
  return synonyms.some(synonym => legacyResolution.includes(synonym));
};

// Calculate use case specific metrics
export const calculateUseCaseMetrics = (calls: Call[], config: BusinessUseCaseConfig) => {
  const totalCalls = calls.length;
  const totalDuration = calls.reduce((sum, call) => sum + (parseInt(call.duration) || 0), 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

  // Calculate primary success metric based on use case
  const primaryOutcome = config.outcomes.find(outcome => outcome.priority === 1);
  const successfulCalls = calls.filter(call => 
    call.resolution?.toLowerCase() === primaryOutcome?.key.toLowerCase()
  ).length;

  const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

  return {
    totalCalls,
    avgDuration,
    appointments: successfulCalls, // Generic name for successful outcomes
    bookingRate: successRate      // Generic name for success rate
  };
};