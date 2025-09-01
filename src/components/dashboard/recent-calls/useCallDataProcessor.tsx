
import { useState, useMemo, useEffect } from "react";
import { prioritizedCallSort } from "@/utils/callSortUtils";
import { normalizeResolution } from "@/components/dashboard/call-outcomes/utils";

interface UseCallDataProcessorProps {
  callLogs: any[];
  itemsPerPage: number;
}

export function useCallDataProcessor({ callLogs, itemsPerPage }: UseCallDataProcessorProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Check if callLogs is undefined or empty
  const safeCallLogs = Array.isArray(callLogs) ? callLogs : [];
  
  // Use the enhanced prioritizedSort function with explicit appointment prioritization
  const sortedCalls = useMemo(() => {
    console.log(`useCallDataProcessor: Processing ${safeCallLogs.length} calls for display`);
    // Use the shared sorting algorithm to ensure consistent display of appointments
    return prioritizedCallSort(safeCallLogs, true); // Pass true to explicitly prioritize appointments
  }, [safeCallLogs]);
  
  // Calculate pagination
  const totalPages = Math.ceil(sortedCalls.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCalls = sortedCalls.slice(indexOfFirstItem, indexOfLastItem);
  
  // Log for debugging diversity and to verify appointment prioritization
  useMemo(() => {
    if (currentCalls.length > 0) {
      const outcomes = currentCalls.reduce((acc, call) => {
        const resolution = normalizeResolution(call.resolution?.toLowerCase() || 'unknown');
        acc[resolution] = (acc[resolution] || 0) + 1;
        return acc;
      }, {});
      
      // Log which dates are showing up to verify newest-first order
      const dateRanges = currentCalls.map(call => call.date).sort().reverse();
      const dateInfo = dateRanges.length > 0 ? 
        `date range: ${dateRanges[0]} to ${dateRanges[dateRanges.length-1]}` : 'no date info';
      
      // Count booked appointments to verify prioritization
      const appointmentCount = currentCalls.filter(call => 
        normalizeResolution(call.resolution || '') === 'booked appointment'
      ).length;
      
      console.log(`Page ${currentPage} outcomes:`, outcomes, dateInfo, `(${appointmentCount}/${currentCalls.length} appointments)`);
    }
  }, [currentCalls, currentPage]);
  
  // Store the date range of the currently displayed calls for synchronization
  useEffect(() => {
    if (currentCalls.length > 0) {
      try {
        // Get the min and max dates from the current calls
        const dates = currentCalls.map(call => new Date(`${call.date}T${call.time || '00:00'}`));
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        
        // Store in session storage for other components to access
        // This is key for synchronization with the Calls page
        sessionStorage.setItem('recentCallsDateRange', JSON.stringify({
          from: minDate.toISOString(),
          to: maxDate.toISOString()
        }));
        
        // Also update the shared dashboard date range for overall synchronization
        sessionStorage.setItem('lastDashboardDateRange', JSON.stringify({
          from: minDate.toISOString(),
          to: maxDate.toISOString()
        }));
      } catch (e) {
        console.error("Error storing recent calls date range", e);
      }
    }
  }, [currentCalls]);
  
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };
  
  return {
    currentCalls,
    totalPages,
    currentPage,
    handlePageChange
  };
}
