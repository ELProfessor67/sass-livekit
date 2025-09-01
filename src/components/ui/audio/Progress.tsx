
import * as React from "react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/timeUtils";

interface ProgressProps {
  currentTime: number;
  totalDuration: number;
  duration: string;
  onProgressChange: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({ 
  currentTime, 
  totalDuration, 
  duration, 
  onProgressChange 
}, ref) => {
  const progressPercentage = totalDuration ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex-1 space-y-2">
      <div 
        className="relative h-2.5 bg-primary/15 rounded-full cursor-pointer overflow-hidden hover:bg-primary/20 transition-colors"
        onClick={onProgressChange}
        ref={ref}
      >
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/70 to-primary/90 rounded-full transition-all duration-150"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      <div className="flex justify-between text-sm font-medium text-muted-foreground">
        <span>{formatDuration(currentTime.toString())}</span>
        <span>{formatDuration(totalDuration.toString() || duration)}</span>
      </div>
    </div>
  );
});

Progress.displayName = "Progress";
