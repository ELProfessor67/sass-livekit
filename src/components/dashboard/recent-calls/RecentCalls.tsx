
import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardTitle, LabelText } from "@/components/ui/typography";
import { useCallDataProcessor } from "./useCallDataProcessor";
import { RecentCallsTable } from "./RecentCallsTable";
import { CallPagination } from "./CallPagination";

interface RecentCallsProps {
  callLogs?: any[];
  isLoading: boolean;
}

export default function RecentCalls({ callLogs, isLoading }: RecentCallsProps) {
  console.log(`RecentCalls component received ${callLogs?.length || 0} calls`);
  
  // Process the calls data for displaying in the table
  const { 
    currentCalls, 
    totalPages, 
    currentPage, 
    handlePageChange 
  } = useCallDataProcessor({ 
    callLogs: callLogs || [], 
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
            <CardTitle>Recent Calls</CardTitle>
          </div>
          <Badge variant="outline">
            <LabelText className="normal-case">{today}</LabelText>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-[var(--space-2xl)] pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading calls...</span>
          </div>
        ) : (
          <>
            <RecentCallsTable currentCalls={currentCalls} />
            <CallPagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={handlePageChange} 
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
