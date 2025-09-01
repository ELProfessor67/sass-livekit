
import { getIntensityColor } from "./colors";
import { cn } from "@/lib/utils";

interface HeatmapCellProps {
  dayLabel: string;
  timeRange: string;
  avgIntensity: number;
}

export function HeatmapCell({ dayLabel, timeRange, avgIntensity }: HeatmapCellProps) {
  return (
    <div 
      className={cn(
        "aspect-square w-9 h-9 rounded-sm cursor-pointer transition-all duration-300 hover:scale-105 hover:opacity-90 relative group",
        avgIntensity > 70 && "animate-pulse-subtle"
      )}
      style={{ 
        backgroundColor: getIntensityColor(avgIntensity),
        boxShadow: avgIntensity > 40 ? 
          `0 0 ${Math.min(12, 6 + avgIntensity/10)}px ${getIntensityColor(avgIntensity)}${avgIntensity > 60 ? 'cc' : '99'}` : 
          'none'
      }}
    >
      <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 backdrop-blur-xl bg-background/95 border border-border rounded-xl text-xs shadow-lg z-10 w-36 pointer-events-none transition-all duration-200 transform group-hover:translate-y-0 translate-y-1">
        <div className="font-medium text-foreground">{dayLabel}</div>
        <div className="text-muted-foreground">{timeRange}</div>
        <div className="mt-1 font-semibold text-foreground">{Math.round(avgIntensity)}% activity</div>
      </div>
    </div>
  );
}
