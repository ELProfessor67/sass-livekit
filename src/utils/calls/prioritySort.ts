import { Call } from "@/components/calls/types";
import { normalizeResolution } from "@/components/dashboard/call-outcomes/utils";
import { SortingOptions } from "./types";
import { createDiverseCallList } from "./diversityUtils";
import { sortCallsByDate } from "./baseSorting";

// Final sorting based on priority settings
export const applySortingPriorities = (
  diverseFirstPage: Call[],
  prioritizeAppointments: boolean
): Call[] => {
  return [...diverseFirstPage].sort((a, b) => {
    const outcomeA = normalizeResolution(a.resolution || '');
    const outcomeB = normalizeResolution(b.resolution || '');
    
    // If prioritizeAppointments is true, prioritize booked appointments
    if (prioritizeAppointments) {
      // If both are booked appointments, sort by date (newest first)
      if (outcomeA === 'booked appointment' && outcomeB === 'booked appointment') {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
        const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
        return dateB.getTime() - dateA.getTime();
      }
      
      // If only one is an appointment, it goes first
      if (outcomeA === 'booked appointment') return -1;
      if (outcomeB === 'booked appointment') return 1;
    }
    
    // Otherwise sort by date for consistency (newest first)
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
    return dateB.getTime() - dateA.getTime();
  });
};
