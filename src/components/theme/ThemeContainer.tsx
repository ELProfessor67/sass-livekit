import * as React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

interface ThemeContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "base" | "elevated" | "overlay";
  spacing?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
}

export function ThemeContainer({ 
  className, 
  variant = "base",
  spacing = "lg",
  children, 
  ...props 
}: ThemeContainerProps) {
  const { uiStyle } = useTheme();
  
  const spacingClasses = {
    sm: "p-[var(--space-lg)]",
    md: "p-[var(--space-xl)]", 
    lg: "p-[var(--space-2xl)]",
    xl: "p-[var(--space-3xl)]"
  };
  
  // Glass UI aware variant classes
  const getVariantClasses = (variant: string) => {
    if (uiStyle === "glass") {
      // In Glass UI mode, use transparent/glass backgrounds
      switch (variant) {
        case "base":
          return ""; // No solid background for Glass UI
        case "elevated":
          return "backdrop-blur-sm bg-white/[0.05] dark:bg-white/[0.08]";
        case "overlay":
          return "backdrop-blur-md bg-white/[0.08] dark:bg-white/[0.12]";
        default:
          return "";
      }
    } else {
      // Minimal UI mode uses solid backgrounds
      return {
        base: "surface-base",
        elevated: "surface-elevated", 
        overlay: "surface-overlay"
      }[variant] || "";
    }
  };
  
  return (
    <div
      className={cn(
        getVariantClasses(variant),
        spacingClasses[spacing],
        "transition-theme-base",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}