
import { useEffect, useState } from 'react';
import { processCallLogs } from './heatmap/utils';
import type { HeatmapDataPoint } from './heatmap/types';

export function useProcessHeatmapData(callLogs: any[] = []) {
  const [heatmapData, setHeatmapData] = useState<HeatmapDataPoint[]>([]);

  useEffect(() => {
    const data = processCallLogs(callLogs);
    setHeatmapData(data);
  }, [callLogs]);

  return heatmapData;
}

export type { HeatmapDataPoint };
