
import { Call } from "@/components/calls/types";

// Sort calls by date (newest first)
export const sortCallsByDate = (calls: Call[]): Call[] => {
  return [...calls].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
    return dateB.getTime() - dateA.getTime();
  });
};
