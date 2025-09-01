
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModernAudioPlayer } from "@/components/ui/modern-audio-player";
import { useToast } from "@/hooks/use-toast";

interface RecordingPlayerProps {
  recording?: string;
  duration: string;
}

export function RecordingPlayer({ recording, duration }: RecordingPlayerProps) {
  const { toast } = useToast();

  const handleDownload = () => {
    toast({
      title: "Recording downloaded",
      description: "Call recording has been downloaded",
    });
  };

  if (!recording) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-muted/30">
        <p className="text-muted-foreground">No recording available for this call.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ModernAudioPlayer 
        src={recording} 
        duration={duration}
        onDownload={handleDownload}
        className="w-full rounded-xl"
      />
    </div>
  );
}
