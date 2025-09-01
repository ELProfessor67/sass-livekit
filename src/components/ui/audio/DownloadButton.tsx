
import * as React from "react";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";

interface DownloadButtonProps {
  onClick: () => void;
}

export function DownloadButton({ onClick }: DownloadButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center",
        "w-10 h-10 rounded-full",
        "transition-all duration-300",
        "hover:bg-primary/10",
        "dark:hover:bg-primary/20"
      )}
      aria-label="Download recording"
    >
      <Download className="w-4 h-4 text-primary" />
    </button>
  );
}
