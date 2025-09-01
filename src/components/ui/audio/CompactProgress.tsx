
import * as React from "react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/timeUtils";

interface CompactProgressProps {
  currentTime: number;
  totalDuration: number;
  duration: string;
  onProgressChange: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const CompactProgress = React.forwardRef<HTMLDivElement, CompactProgressProps>(({
  currentTime,
  totalDuration,
  duration,
  onProgressChange
}, ref) => {
  const progressPercentage = totalDuration ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex-1 space-y-1">
      <div
        className="relative h-1 bg-primary/10 rounded-full cursor-pointer overflow-hidden hover:bg-primary/15 transition-colors"
        onClick={onProgressChange}
        ref={ref}
      >
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/60 to-primary/80 rounded-full transition-all duration-150"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
        <span>{formatDuration(currentTime.toString())}</span>
        <span>{formatDuration(totalDuration.toString() || duration)}</span>
      </div>
    </div>
  );
});

CompactProgress.displayName = "CompactProgress";
