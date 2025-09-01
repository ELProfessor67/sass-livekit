
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCallDataProcessor } from "./useCallDataProcessor";
import { RecentCallsTable } from "./RecentCallsTable";
import { CallPagination } from "./CallPagination";
import { ThemeCard } from "@/components/theme";

interface RecentCallsProps {
  callLogs: any[];
  isLoading: boolean;
}

export default function RecentCalls({ callLogs, isLoading }: RecentCallsProps) {
  console.log(`RecentCalls component received ${callLogs.length} calls`);
  
  // Process the calls data for displaying in the table
  const { 
    currentCalls, 
    totalPages, 
    currentPage, 
    handlePageChange 
  } = useCallDataProcessor({ 
    callLogs, 
    itemsPerPage: 5 
  });

  console.log(`RecentCalls showing page ${currentPage}/${totalPages}, ${currentCalls.length} calls`);

  // Get today's date for the badge
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
  
  return (
    <Card variant="glass" className="transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10">
      <CardHeader className="pb-[var(--space-md)] space-y-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center liquid-space-md">
            <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary/60 liquid-rounded-sm" />
            <CardTitle className="text-[var(--text-lg)] font-[var(--font-extralight)] tracking-tight text-liquid">
              Recent Calls
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[var(--text-xs)] font-[var(--font-normal)]">
            {today}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-[var(--space-2xl)] pt-0">
        <RecentCallsTable currentCalls={currentCalls} />
        <CallPagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={handlePageChange} 
        />
      </CardContent>
    </Card>
  );
}
