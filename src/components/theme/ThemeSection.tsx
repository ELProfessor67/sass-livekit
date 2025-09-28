import * as React from "react";
import { cn } from "@/lib/utils";

interface ThemeSectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
}

export function ThemeSection({ 
  className, 
  spacing = "lg",
  children, 
  ...props 
}: ThemeSectionProps) {
  const spacingClasses = {
    sm: "space-y-[var(--space-lg)]",
    md: "space-y-[var(--space-xl)]",
    lg: "space-y-[var(--space-2xl)]", 
    xl: "space-y-[var(--space-3xl)]"
  };
  
  return (
    <section
      className={cn(
        spacingClasses[spacing],
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}