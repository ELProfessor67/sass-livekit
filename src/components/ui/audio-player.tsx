
import * as React from "react";
import { cn } from "@/lib/utils";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useTheme } from "next-themes";

interface AudioPlayerProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  duration?: string;
}

export function AudioPlayer({ src, duration = "0:00", className, ...props }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [totalDuration, setTotalDuration] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const { theme } = useTheme();

  React.useEffect(() => {
    const audio = new Audio(src);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    
    const handleLoadMetadata = () => {
      setTotalDuration(audio.duration);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
    };
    
    audio.addEventListener("loadedmetadata", handleLoadMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    
    // Load audio data
    audio.load();
    
    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // Add error handling for playback
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Playback started successfully
              setIsPlaying(true);
            })
            .catch(error => {
              console.error("Audio playback failed:", error);
              // Provide visual feedback about the error
              setIsPlaying(false);
            });
        }
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      const newTime = value[0];
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const displayDuration = totalDuration ? formatTime(totalDuration) : duration;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md p-1 transition-colors",
        theme === "dark" 
          ? "bg-slate-900/20 border border-slate-800/50" 
          : "bg-slate-100/50 border border-slate-200/50",
        "backdrop-blur-sm",
        className
      )}
      {...props}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 rounded-full transition-colors duration-200",
          isPlaying 
            ? "text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20" 
            : "text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10"
        )}
        onClick={togglePlayPause}
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
      </Button>

      <div className="flex flex-1 flex-col">
        <Slider
          value={[currentTime]}
          max={totalDuration || 100}
          step={0.1}
          className="h-1 py-0"
          onValueChange={handleSliderChange}
          trackClassName={cn(
            theme === "dark" 
              ? "bg-slate-800/50" 
              : "bg-slate-200/50"
          )}
          thumbClassName={cn(
            "h-3 w-3 border-2",
            theme === "dark"
              ? "bg-indigo-500 border-indigo-400"
              : "bg-indigo-500 border-indigo-600"
          )}
        />
        
        <div className="flex justify-between text-[10px] font-medium text-muted-foreground mt-1 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{displayDuration}</span>
        </div>
      </div>
    </div>
  );
}
