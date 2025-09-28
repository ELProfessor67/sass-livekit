
import { parseISO, getDay, getHours } from 'date-fns';
import type { HeatmapDataPoint } from './types';

export const processCallLogs = (callLogs: any[]): HeatmapDataPoint[] => {
  if (!callLogs.length) return [];

  // Initialize counts for each day and hour
  const callCounts: { [key: string]: number } = {};
  let maxCalls = 0;

  // Count calls for each day and hour
  callLogs.forEach(call => {
    if (!call.created_at) return;
    
    const date = parseISO(call.created_at);
    const day = getDay(date);
    const hour = getHours(date);
    const key = `${day}-${hour}`;
    
    callCounts[key] = (callCounts[key] || 0) + 1;
    maxCalls = Math.max(maxCalls, callCounts[key]);
  });

  // Only use real call data - no synthetic data generation

  // Generate heatmap data points
  const data: HeatmapDataPoint[] = [];
  
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${day}-${hour}`;
      const count = callCounts[key] || 0;
      const intensity = maxCalls > 0 ? (count / maxCalls) * 100 : 0;
      
      data.push({
        day,
        hour,
        intensity
      });
    }
  }

  return data;
};
