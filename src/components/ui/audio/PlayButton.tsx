
import * as React from "react";
import { cn } from "@/lib/utils";
import { Play, Pause } from "lucide-react";

interface PlayButtonProps {
  isPlaying: boolean;
  onClick: () => void;
}

export function PlayButton({ isPlaying, onClick }: PlayButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center",
        "w-16 h-16",
        "rounded-full",
        "transition-all duration-300 ease-in-out",
        "bg-primary/10 hover:bg-primary/20",
        "dark:bg-primary/20 dark:hover:bg-primary/30",
        isPlaying ? "scale-95" : "scale-100 hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-primary focus-visible:ring-offset-2"
      )}
      aria-label={isPlaying ? "Pause" : "Play"}
    >
      {isPlaying ? (
        <Pause className="w-7 h-7 text-primary" />
      ) : (
        <Play className="w-7 h-7 text-primary translate-x-0.5" />
      )}
    </button>
  );
}
