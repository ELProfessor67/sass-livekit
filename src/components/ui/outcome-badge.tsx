
import React from "react";
import { cn } from "@/lib/utils";

interface OutcomeBadgeProps {
  outcome: string;
  icon: React.ReactNode;
  color: string;
  className?: string;
}

export function OutcomeBadge({ outcome, icon, color, className }: OutcomeBadgeProps) {
  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium transition-colors font-feature-settings tracking-tight antialiased",
      className
    )}>
      <div 
        className="p-1 rounded-full flex items-center justify-center"
        style={{ backgroundColor: color }}
      >
        {React.cloneElement(icon as React.ReactElement, {
          className: "w-3.5 h-3.5 text-white",
          strokeWidth: 2
        })}
      </div>
      <span style={{ color }} className="font-medium font-feature-settings tracking-tight">{outcome}</span>
    </div>
  );
}
