
import React from "react";
import { cn } from "@/lib/utils";

interface PinkBadgeProps {
  children: React.ReactNode;
  variant?: "subtle" | "medium" | "strong" | "primary";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PinkBadge({ 
  children, 
  variant = "medium", 
  size = "md",
  className 
}: PinkBadgeProps) {
  const variantStyles = {
    subtle: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800/30",
    medium: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-200 dark:border-cyan-700/40",
    strong: "bg-cyan-200 text-cyan-900 border-cyan-400 dark:bg-cyan-800/40 dark:text-cyan-100 dark:border-cyan-600/50",
    primary: "bg-primary text-primary-foreground border-primary/20 shadow-sm"
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base"
  };

  return (
    <span className={cn(
      "inline-flex items-center rounded-full border font-medium transition-colors",
      "liquid-glass-light liquid-transition pink-highlight",
      variantStyles[variant],
      sizeStyles[size],
      className
    )}>
      {children}
    </span>
  );
}
