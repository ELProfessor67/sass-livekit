import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/components/ThemeProvider";

interface ThemeCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "glass-light" | "glass-heavy" | "glass-reading" | "premium" | "ultra-premium" | "enterprise" | "liquid" | "frosted-premium" | "transparent" | "elevated" | "premium-enhanced";
  interactive?: boolean;
  children: React.ReactNode;
}

export function ThemeCard({ 
  className, 
  variant = "default", 
  interactive = false,
  children, 
  ...props 
}: ThemeCardProps) {
  const { uiStyle } = useTheme();
  const cardVariant = variant === "default" ? (uiStyle === "glass" ? "glass" : "default") : variant;
  
  return (
    <Card
      variant={cardVariant}
      className={cn(
        // Base theme styling
        "transition-theme-base",
        
        // Interactive states
        interactive && [
          "cursor-pointer",
          "hover-theme-accent",
          "hover:shadow-[var(--shadow-glass-lg)]",
          "hover:scale-[1.02]"
        ],
        
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}