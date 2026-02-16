
import * as React from "react";
import { cn } from "@/lib/utils";
import { PlayButton } from "./audio/PlayButton";
import { Progress } from "./audio/Progress";
import { DownloadButton } from "./audio/DownloadButton";
import { supabase } from "@/integrations/supabase/client";

interface ModernAudioPlayerProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  duration?: string;
  onDownload?: () => void;
}

export function ModernAudioPlayer({
  src,
  duration = "0:00",
  onDownload,
  className,
  ...props
}: ModernAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [totalDuration, setTotalDuration] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const progressRef = React.useRef<HTMLDivElement>(null);
  const objectUrlRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const isAuthenticatedEndpoint = src.includes("/api/v1/calls/recording") ||
      src.includes("/api/v1/call/recording") ||
      src.includes("/api/v1/calls/recording");

    const loadAudio = async () => {
      try {
        setLoading(true);
        setError(null);
        let audioUrl = src;

        if (isAuthenticatedEndpoint) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw new Error("No authentication token available");
          }

          const response = await fetch(src, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });

          if (!response.ok) {
            throw new Error(`Failed to load audio: ${response.status} ${response.statusText}`);
          }

          const blob = await response.blob();
          audioUrl = URL.createObjectURL(blob);
          objectUrlRef.current = audioUrl;
        }

        const audio = new Audio(audioUrl);
        audio.crossOrigin = "anonymous";
        audioRef.current = audio;

        const handleLoadMetadata = () => {
          setTotalDuration(audio.duration);
          setLoading(false);
        };

        const handleTimeUpdate = () => {
          setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };

        const handleAudioError = (e: any) => {
          console.error("Audio element error:", e);
          setError("Failed to play audio. The format may not be supported or the file is corrupted.");
          setLoading(false);
        };

        audio.addEventListener("loadedmetadata", handleLoadMetadata);
        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleAudioError);

        audio.load();

        return () => {
          audio.pause();
          audio.removeEventListener("loadedmetadata", handleLoadMetadata);
          audio.removeEventListener("timeupdate", handleTimeUpdate);
          audio.removeEventListener("ended", handleEnded);
          audio.removeEventListener("error", handleAudioError);
        };
      } catch (err) {
        console.error("Error loading audio:", err);
        setError(err instanceof Error ? err.message : "Failed to load audio");
        setLoading(false);
      }
    };

    loadAudio();

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [src]);

  const togglePlayPause = () => {
    if (audioRef.current && !loading && !error) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch(error => {
              console.error("Audio playback failed:", error);
              setIsPlaying(false);
            });
        }
      }
    }
  };

  const handleProgressChange = (event: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && audioRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * (totalDuration || parseFloat(duration));

      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  if (error) {
    return (
      <div className={cn("w-full p-4 bg-destructive/10 rounded-xl border border-destructive/20", className)} {...props}>
        <p className="text-sm text-destructive font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full p-6",
        "bg-gradient-to-b from-background/80 to-muted/20",
        "backdrop-blur-xl border border-primary/5",
        "transition-all duration-300 hover:border-primary/10",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-6">
        <PlayButton
          isPlaying={isPlaying}
          onClick={togglePlayPause}
          disabled={loading || !!error}
        />
        {loading ? (
          <div className="flex-1 h-2 flex items-center justify-center">
            <div className="w-full bg-primary/10 h-1 rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-pulse w-1/3 rounded-full"></div>
            </div>
          </div>
        ) : (
          <Progress
            currentTime={currentTime}
            totalDuration={totalDuration}
            duration={duration}
            onProgressChange={handleProgressChange}
            ref={progressRef}
          />
        )}
        {onDownload && !loading && <DownloadButton onClick={onDownload} />}
      </div>
    </div>
  );
}
