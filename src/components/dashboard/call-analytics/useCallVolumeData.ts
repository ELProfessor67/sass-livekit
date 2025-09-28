
import { useState, useEffect } from "react";
import { format, eachDayOfInterval, startOfDay, endOfDay, isSameDay, differenceInDays } from "date-fns";

interface CallVolumeDataProps {
  dateRange?: {
    from: Date;
    to: Date;
    compareWith?: { from: Date; to: Date };
  };
  callLogs?: any[];
}

export function useCallVolumeData({ dateRange, callLogs = [] }: CallVolumeDataProps) {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!dateRange || !callLogs.length) return;
    
    // Generate an array of all days in the date range
    const days = eachDayOfInterval({
      start: startOfDay(dateRange.from),
      end: endOfDay(dateRange.to)
    });

    // Calculate the number of days in the range
    const daysInRange = differenceInDays(dateRange.to, dateRange.from) + 1;
    
    // Create a map of call counts by date
    const callsByDate = callLogs.reduce((acc: { [key: string]: number }, call) => {
      const callDate = new Date(call.date);
      const formattedDate = format(callDate, 'MMM d');
      acc[formattedDate] = (acc[formattedDate] || 0) + 1;
      return acc;
    }, {});

    // Generate chart data using only real call data
    const data = days.map((day) => {
      const dateKey = format(day, 'MMM d');
      const value = callsByDate[dateKey] || 0;
      
      return {
        name: dateKey,
        fullDate: day,
        value,
        date: format(day, 'MMM d, yyyy')
      };
    });

    setChartData(data);
  }, [dateRange, callLogs]);

  return chartData;
}
