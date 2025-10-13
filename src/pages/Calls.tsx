
import { useMemo, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/layout/DashboardLayout";
import CallsHeader from "@/components/calls/CallsHeader";
import CallsToolbar from "@/components/calls/CallsToolbar";
import { CallsTable } from "@/components/calls/table";
import CallsPagination from "@/components/calls/CallsPagination";
import { useCallsFilter } from "@/components/calls/useCallsFilter";
import { fetchCalls } from "@/lib/api/calls/fetchCalls";
import { useLocation } from "react-router-dom";
import { ThemeContainer, ThemeSection, ThemeCard } from "@/components/theme";
import { useAuth } from "@/contexts/SupportAccessAuthContext";
import { useQuery } from "@tanstack/react-query";

export default function Calls() {
  const { toast } = useToast();
  const location = useLocation();
  const { user, loading: isAuthLoading } = useAuth();

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

  // Fetch real calls data using React Query
  const { data: callsData, isLoading, error, refetch: loadCalls } = useQuery({
    queryKey: ['calls', user?.id, filterDateRange],
    queryFn: async () => {
      const response = await fetchCalls();
      return response;
    },
    enabled: !isAuthLoading && !!user?.id,
    refetchOnMount: true,
    staleTime: 1000 * 60 * 2, // 2 minutes for calls data
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

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
    setIsRefreshing(true);
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

    // Reload calls with new date range
    loadCalls().finally(() => {
      setIsRefreshing(false);
      toast({
        title: "Date range updated",
        description: `Showing calls from ${range.from.toLocaleDateString()} to ${range.to.toLocaleDateString()}`,
      });
    });
  };

  // Reset page number when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, resolutionFilter]);

  // Handle loading and error states
  if (isAuthLoading || isLoading) {
    return (
      <DashboardLayout>
        <ThemeContainer variant="base" className="min-h-screen no-hover-scaling">
          <CallsHeader />
          <div className="container mx-auto px-[var(--space-2xl)] py-[var(--space-2xl)]">
            <ThemeSection spacing="lg">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading calls...</p>
                </div>
              </div>
            </ThemeSection>
          </div>
        </ThemeContainer>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ThemeContainer variant="base" className="min-h-screen no-hover-scaling">
          <CallsHeader />
          <div className="container mx-auto px-[var(--space-2xl)] py-[var(--space-2xl)]">
            <ThemeSection spacing="lg">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="text-destructive mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Calls</h3>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </ThemeSection>
          </div>
        </ThemeContainer>
      </DashboardLayout>
    );
  }

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
                {/* <LiveKitDemo /> */}
              </div>
              <ThemeCard variant="glass" className="overflow-hidden">
                <CallsTable
                  calls={paginatedCalls}
                  isLoading={isRefreshing}
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
