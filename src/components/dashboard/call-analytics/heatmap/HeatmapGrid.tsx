
import { HeatmapCell } from "./HeatmapCell";
import { DAYS, TIME_LABELS, HOUR_GROUPS } from "./constants";
import type { HeatmapDataPoint } from "./types";

interface HeatmapGridProps {
  heatmapData: HeatmapDataPoint[];
}

export function HeatmapGrid({ heatmapData }: HeatmapGridProps) {
  return (
    <div className="ml-14 h-[calc(100%-32px)] grid grid-rows-6 gap-1.5">
      {HOUR_GROUPS.map((hourGroup, rowIndex) => (
        <div key={`row-${hourGroup}`} className="grid grid-cols-7 gap-1.5">
          {DAYS.map((day, dayIndex) => {
            const dataPoints = heatmapData.filter(
              d => d.day === dayIndex && d.hour >= hourGroup && d.hour < hourGroup + 4
            );
            
            // Calculate more realistic intensity values based on our data pattern
            let avgIntensity = 0;
            
            if (dataPoints.length) {
              // Enhanced weighting system for more visual contrast
              const weightedPoints = dataPoints.map(d => {
                // Enhanced business hours with higher contrast
                let weight = 1.0;
                const hour = d.hour;
                
                // Boost business hours more significantly
                if (hour >= 8 && hour <= 17) {
                  weight = 1.4; // Business hours get higher weight
                }
                if (hour >= 10 && hour <= 15) {
                  weight = 1.7; // Peak business hours get even higher weight
                }
                // Boost peak lunch hours the most
                if (hour >= 11 && hour <= 13) {
                  weight = 2.0; // Lunch hours get highest weight
                }
                
                return d.intensity * weight;
              });
              
              avgIntensity = weightedPoints.reduce((sum, d) => sum + d, 0) / dataPoints.length;
              
              // Enhanced day of week adjustments for more visual contrast
              // Tuesday and Wednesday show higher call volumes
              if (dayIndex === 2) {
                avgIntensity *= 1.15; // Tuesday boost
              } else if (dayIndex === 3) {
                avgIntensity *= 1.2;  // Wednesday even higher
              } else if (dayIndex === 4) {
                avgIntensity *= 1.1;  // Thursday moderate boost
              }
              
              // Weekend adjustment - more significant reduction
              if (dayIndex === 0 || dayIndex === 6) {
                avgIntensity *= 0.6; // Stronger weekend reduction
              }
              
              // Cap intensity at 95% to maintain realism
              avgIntensity = Math.min(95, avgIntensity);
            }
            
            const timeRange = `${TIME_LABELS[rowIndex]} - ${rowIndex < 5 ? TIME_LABELS[rowIndex + 1] : '12 am'}`;
            
            return (
              <HeatmapCell
                key={`cell-${hourGroup}-${dayIndex}`}
                dayLabel={day}
                timeRange={timeRange}
                avgIntensity={avgIntensity}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
