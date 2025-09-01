
import { cn } from "@/lib/utils";
import { CaretUp, CaretDown } from "phosphor-react";

interface StatCardProps {
  title: React.ReactNode;
  value: React.ReactNode;
  icon: React.ReactNode;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div className={cn(
      // Enterprise glass base with subtle border
      "glass-enterprise glass-micro-lift border-glass-subtle",
      // Layout and spacing
      "rounded-2xl p-6",
      // Backdrop and borders with periwinkle/bluish glass
      "bg-[hsl(var(--glass-periwinkle-light))] dark:bg-[hsl(var(--glass-bluish-light))] backdrop-blur-md border-[hsl(var(--glass-border-periwinkle))] dark:border-[hsl(var(--glass-border-bluish))]",
      // Shadows and interactions
      "shadow-xl transition-all duration-300",
      "hover:scale-105 hover:shadow-2xl hover:shadow-white/5",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        {/* Title with enhanced typography */}
        <div className="text-glass-enhanced text-sm font-medium tracking-tighter text-muted-foreground">
          {title}
        </div>
        
        {/* Trend indicator */}
        {trend && (
          <span className={cn(
            "flex items-center space-x-1 text-xs px-2 py-1 rounded-xl",
            "bg-muted/30 transition-all duration-300",
            trend.positive 
              ? "text-success hover:bg-success/10" 
              : "text-destructive hover:bg-destructive/10"
          )}>
            {trend.positive ? (
              <CaretUp size={10} weight="bold" />
            ) : (
              <CaretDown size={10} weight="bold" />
            )}
            <span className="font-medium tracking-tight">
              {trend.positive ? "+" : ""}
              {trend.value}%
            </span>
          </span>
        )}
      </div>
      
      {/* Main content area - direct on glass */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-glass-primary text-3xl font-normal tracking-tighter">
          {value}
        </div>
        
        {/* Electric blue icon container */}
        <div className={cn(
          "w-12 h-12 flex items-center justify-center",
          "rounded-xl backdrop-blur-md transition-all duration-300",
          // Electric blue background with gradient
          "bg-gradient-to-br from-[hsl(var(--electric-blue-subtle))] to-[hsl(var(--electric-blue-medium))]",
          "dark:from-[hsl(var(--electric-blue-medium))] dark:to-[hsl(var(--electric-blue-high))]",
          // Electric border and glow
          "border border-[hsl(var(--electric-blue-medium)/0.5)] dark:border-[hsl(var(--electric-blue-high)/0.6)]",
          "shadow-lg shadow-[hsl(var(--electric-glow)/0.3)]",
          // Icon color - white for contrast against electric blue
          "text-white",
          // Enhanced hover effects with electric glow
          "hover:scale-105 hover:shadow-xl hover:shadow-[hsl(var(--electric-glow)/0.5)]",
          "hover:bg-gradient-to-br hover:from-[hsl(var(--electric-blue-medium))] hover:to-[hsl(var(--electric-blue-high))]",
          "dark:hover:from-[hsl(var(--electric-blue-high))] dark:hover:to-[hsl(var(--electric-blue-high))]",
          // Interaction states
          "active:scale-95",
          "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--electric-glow)/0.4)]"
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
