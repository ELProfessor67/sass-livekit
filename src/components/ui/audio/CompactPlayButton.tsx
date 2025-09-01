
import * as React from "react";
import { cn } from "@/lib/utils";
import { Play, Pause } from "lucide-react";

interface CompactPlayButtonProps {
  isPlaying: boolean;
  onClick: () => void;
}

export function CompactPlayButton({ isPlaying, onClick }: CompactPlayButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center",
        "w-6 h-6",
        "rounded-full",
        "transition-all duration-200",
        "bg-primary/10 hover:bg-primary/20",
        "dark:bg-primary/20 dark:hover:bg-primary/30",
        isPlaying ? "scale-95" : "scale-100 hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-1",
        "focus-visible:ring-primary focus-visible:ring-offset-1"
      )}
      aria-label={isPlaying ? "Pause" : "Play"}
    >
      {isPlaying ? (
        <Pause className="w-3 h-3 text-primary" />
      ) : (
        <Play className="w-3 h-3 text-primary translate-x-[1px]" />
      )}
    </button>
  );
}
