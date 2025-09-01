import { Call } from "@/components/calls/types";
import { normalizeResolution } from "@/components/dashboard/call-outcomes/utils";
import { groupCallsByOutcome, extractAppointments } from "./outcomeUtils";
import { sortCallsByDate } from "./baseSorting";

// Create a diverse list of calls with a good distribution of outcomes
export const createDiverseCallList = (
  calls: Call[],
  maxItems: number,
  targetAppointmentPercentage: number = 0.39
): Call[] => {
  if (calls.length === 0) return [];
  
  // First, sort all calls by date and separate appointments
  const sortedCalls = sortCallsByDate(calls);
  const appointments = extractAppointments(sortedCalls);
  const otherCalls = sortedCalls.filter(call => {
    const outcome = normalizeResolution(call.resolution || '');
    return outcome !== 'booked appointment';
  });
  
  // Calculate target number of appointments
  const targetAppointmentsCount = Math.ceil(maxItems * targetAppointmentPercentage);
  const appointmentsToShow = Math.min(appointments.length, targetAppointmentsCount);
  
  console.log(`createDiverseCallList: Found ${appointments.length} appointments, showing ${appointmentsToShow} (target: ${targetAppointmentsCount})`);
  
  // Group other calls by outcome
  const byOutcome = groupCallsByOutcome(otherCalls);
  
  // Build our diverse output array
  let diverseList: Call[] = [];
  let appointmentCopy = [...sortCallsByDate(appointments)];
  let nextOutcomes = Object.keys(byOutcome).filter(outcome => byOutcome[outcome].length > 0);
  let lastThreeOutcomes: string[] = [];
  
  // Distribute appointments evenly throughout the results
  const appointmentInterval = appointmentsToShow > 0 ? Math.floor(maxItems / appointmentsToShow) : maxItems;
  
  // Build the diverse list
  while (diverseList.length < maxItems) {
    // Time to place an appointment?
    if (appointmentCopy.length > 0 && (diverseList.length % appointmentInterval === 0 || Math.random() < 0.2)) {
      diverseList.push(appointmentCopy.shift()!);
      lastThreeOutcomes.push('booked appointment');
    }
    // Otherwise place a diverse outcome
    else if (nextOutcomes.length > 0) {
      const availableOutcome = getNextDiverseOutcome(nextOutcomes, lastThreeOutcomes, byOutcome);
      if (availableOutcome) {
        diverseList.push(byOutcome[availableOutcome].shift()!);
        lastThreeOutcomes.push(availableOutcome);
        
        // Update available outcomes
        nextOutcomes = Object.keys(byOutcome).filter(outcome => byOutcome[outcome].length > 0);
      }
    }
    
    // Track only the last 3 outcomes for our "no more than 3 in a row" rule
    if (lastThreeOutcomes.length > 3) {
      lastThreeOutcomes.shift();
    }
    
    // If we've run out of outcomes but still have appointments, fill with appointments
    if (nextOutcomes.length === 0 && appointmentCopy.length > 0) {
      // Add remaining appointments
      diverseList = diverseList.concat(appointmentCopy);
      break;
    }
    
    // If we've run out of all calls, break
    if (nextOutcomes.length === 0 && appointmentCopy.length === 0) {
      break;
    }
  }
  
  // Make sure we don't exceed the max items
  return diverseList.slice(0, maxItems);
};

// Helper function to get next diverse outcome
function getNextDiverseOutcome(
  availableOutcomes: string[],
  lastThreeOutcomes: string[],
  byOutcome: Record<string, Call[]>
): string | null {
  // Filter out outcomes that would create more than 3 in a row
  const diverseOutcomes = availableOutcomes.filter(outcome => {
    if (lastThreeOutcomes.length >= 3) {
      const lastThree = lastThreeOutcomes.slice(-3);
      if (lastThree.every(last => last === outcome)) {
        return false;
      }
    }
    return true;
  });
  
  if (diverseOutcomes.length > 0) {
    // Pick a random outcome from available ones
    const randomIndex = Math.floor(Math.random() * diverseOutcomes.length);
    return diverseOutcomes[randomIndex];
  } else if (availableOutcomes.length > 0) {
    // Edge case: force a different outcome by using something not in the last 2
    const forcedOutcomes = Object.keys(byOutcome).filter(outcome => 
      byOutcome[outcome].length > 0 && !lastThreeOutcomes.slice(-2).includes(outcome)
    );
    
    if (forcedOutcomes.length > 0) {
      return forcedOutcomes[0];
    }
    
    // If all else fails, just use any available outcome
    return availableOutcomes[0];
  }
  
  return null;
}
