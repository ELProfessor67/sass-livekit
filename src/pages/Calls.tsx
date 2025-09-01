
import { useMemo, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/layout/DashboardLayout";
import CallsHeader from "@/components/calls/CallsHeader";
import CallsToolbar from "@/components/calls/CallsToolbar";
import { CallsTable } from "@/components/calls/table";
import CallsPagination from "@/components/calls/CallsPagination";
import { useCallsFilter } from "@/components/calls/useCallsFilter";
import { generateCalls } from "@/lib/api/mockData/generator";
import { useLocation } from "react-router-dom";
import { ThemeContainer, ThemeSection, ThemeCard } from "@/components/theme";
import LiveKitDemo from "@/components/calls/LiveKitDemo";

export default function Calls() {
  const { toast } = useToast();
  const location = useLocation();
  
  // Get the date range from session storage or location state
  const [filterDateRange, setFilterDateRange] = useState(() => {
    // First, try to get from Recent Calls component which has the most up-to-date range
    try {
      const recentCallsRange = sessionStorage.getItem('recentCallsDateRange');
      if (recentCallsRange) {
        const parsed = JSON.parse(recentCallsRange);
        return {
          from: new Date(parsed.from),
          to: new Date(parsed.to)
        };
      }
    } catch (e) {
      console.error("Error parsing recent calls date range", e);
    }
    
    // Second, try to get from dashboard's last used range
    try {
      const dashboardRange = sessionStorage.getItem('lastDashboardDateRange');
      if (dashboardRange) {
        const parsed = JSON.parse(dashboardRange);
        return {
          from: new Date(parsed.from),
          to: new Date(parsed.to)
        };
      }
    } catch (e) {
      console.error("Error parsing dashboard date range", e);
    }
    
    // Third, try from location state (direct navigation)
    if (location.state?.dateRange) {
      return location.state.dateRange;
    }
    
    // Default fallback
    return {
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date()
    };
  });
  
  // Generate mock data with the same logic as in Index.tsx for consistency
  const callsData = useMemo(() => {
    console.log(`Calls page: Generating mock data for date range: ${filterDateRange.from.toLocaleDateString()} to ${filterDateRange.to.toLocaleDateString()}`);
    const calls = generateCalls(94, filterDateRange);
    console.log(`Calls page: Generated ${calls.length} calls`);
    return {
      calls,
      total: calls.length
    };
  }, [filterDateRange]);

  const [isLoading, setIsLoading] = useState(false);
  
  const {
    searchQuery,
    setSearchQuery,
    resolutionFilter,
    setResolutionFilter,
    dateRange,
    setDateRange,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedCalls,
    filteredCalls
  } = useCallsFilter(callsData?.calls || []);

  // Synchronize the filter's date range with our filterDateRange
  useEffect(() => {
    setDateRange(filterDateRange);
  }, [filterDateRange, setDateRange]);

  // Update date range and reset page
  const handleDateRangeChange = (range: { from: Date; to: Date }) => {
    console.log(`Calls page: Date range changed to: ${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`);
    setIsLoading(true);
    setFilterDateRange(range);
    setDateRange(range);
    setCurrentPage(1);
    
    // Store the selected range for dashboard synchronization
    try {
      sessionStorage.setItem('lastDashboardDateRange', JSON.stringify({
        from: range.from.toISOString(),
        to: range.to.toISOString()
      }));
    } catch (e) {
      console.error("Error storing date range", e);
    }
    
    // Short timeout to allow state updates and simulate loading
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Date range updated",
        description: `Showing calls from ${range.from.toLocaleDateString()} to ${range.to.toLocaleDateString()}`,
      });
    }, 300);
  };

  // Reset page number when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, resolutionFilter]);

  return (
    <DashboardLayout>
      <ThemeContainer variant="base" className="min-h-screen no-hover-scaling">
        <CallsHeader />
        
        <div className="container mx-auto px-[var(--space-2xl)] py-[var(--space-2xl)]">
          <ThemeSection spacing="lg">
            <CallsToolbar 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              resolutionFilter={resolutionFilter}
              onResolutionChange={setResolutionFilter}
              dateRange={filterDateRange}
              onDateRangeChange={handleDateRangeChange}
            />

            <div className="relative w-full">
              <div className="mb-6">
                <LiveKitDemo />
              </div>
              <ThemeCard variant="glass" className="overflow-hidden">
                <CallsTable 
                  calls={paginatedCalls}
                  isLoading={isLoading}
                  filteredCount={filteredCalls.length}
                  totalCount={callsData?.total || 0}
                />
              </ThemeCard>

              <div className="mt-6">
                <CallsPagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </ThemeSection>
        </div>
      </ThemeContainer>
    </DashboardLayout>
  );
}
