import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
interface IconBackgroundProps {
  icon: LucideIcon;
  className?: string;
}
export function IconBackground({
  icon: Icon,
  className
}: IconBackgroundProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Icon className="w-6 h-6" />
    </div>
  );
}