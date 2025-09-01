
import { Call } from "@/components/calls/types";
import { normalizeResolution } from "@/components/dashboard/call-outcomes/utils";

// Group calls by their normalized outcome
export const groupCallsByOutcome = (calls: Call[]): Record<string, Call[]> => {
  const byOutcome: Record<string, Call[]> = {};
  
  calls.forEach(call => {
    const outcome = normalizeResolution(call.resolution || '');
    byOutcome[outcome] = byOutcome[outcome] || [];
    byOutcome[outcome].push(call);
  });
  
  return byOutcome;
};

// Get appointments from calls
export const extractAppointments = (calls: Call[]): Call[] => {
  return calls.filter(call => {
    const outcome = normalizeResolution(call.resolution || '');
    return outcome === 'booked appointment';
  });
};
