
import { Call } from "@/components/calls/types";
import { SortingOptions } from "./types";
import { sortCallsByDate } from "./baseSorting";
import { createDiverseCallList } from "./diversityUtils";
import { applySortingPriorities } from "./prioritySort";
import { outcomePriorities } from "./outcomePriorities";

// Re-export constants and types
export { outcomePriorities } from "./outcomePriorities";
export type { SortingOptions } from "./types";

// Main function that sorts calls with diversity and priority settings
export const prioritizedCallSort = (calls: Call[], prioritizeAppointments: boolean = false): Call[] => {
  // Create a copy of the calls array to avoid mutating the original
  const sortedCalls = [...calls];
  
  // First sort all calls by date (newest first) to ensure chronological ordering
  sortedCalls.sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
    return dateB.getTime() - dateA.getTime();
  });
  
  // For a more realistic first couple of pages, ensure diversity with priority for appointments
  // We'll only modify the first 40 items (covering the first 3-4 pages depending on page size)
  const firstPageCount = Math.min(40, sortedCalls.length);
  const firstPageItems = sortedCalls.slice(0, firstPageCount);
  
  // Create a diverse mix for the first pages
  const diverseFirstPage = createDiverseCallList(firstPageItems, firstPageCount);
  
  // Apply final sorting based on priority settings
  const sortedDiversePage = applySortingPriorities(diverseFirstPage, prioritizeAppointments);
  
  // Replace the first page items with our diverse mix
  sortedCalls.splice(0, firstPageCount, ...sortedDiversePage);
  
  return sortedCalls;
};
