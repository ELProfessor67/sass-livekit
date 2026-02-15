
import { cn } from "@/lib/utils";
import { CaretUp, CaretDown } from "phosphor-react";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/components/ThemeProvider";

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
  const { uiStyle } = useTheme();

  // Use appropriate card variant based on theme
  const cardVariant = uiStyle === "glass" ? "glass" : "default";

  return (
    <Card
      variant={cardVariant}
      className={cn(
        "p-4 transition-all duration-300 h-full flex flex-col justify-between",
        "hover:scale-105 hover:shadow-xl",
        className
      )}
    >
      <div className="flex items-start justify-between">
        {/* Title */}
        <div className="flex flex-1 mr-2 min-h-[2.5rem] items-start">
          {title}
        </div>

        {/* Trend indicator */}
        {trend && (
          <span className={cn(
            "flex items-center space-x-1 text-xs px-2 py-1 rounded-xl flex-shrink-0",
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

      {/* Main content area */}
      <div className="flex items-end justify-between mt-auto pt-2">
        <div className="flex">
          {value}
        </div>

        {/* Icon container */}
        <div className={cn(
          "w-10 h-10 flex items-center justify-center flex-shrink-0",
          "rounded-xl transition-all duration-300",
          "bg-primary text-primary-foreground",
          "hover:scale-105 hover:shadow-lg",
          "shadow-md"
        )}>
          <div className="flex items-center justify-center w-5 h-5">
            {icon}
          </div>
        </div>
      </div>
    </Card>
  );
}
