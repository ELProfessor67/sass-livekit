
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { CaretUp, CaretDown } from "phosphor-react";

interface PremiumStatCardProps {
  title: React.ReactNode;
  value: React.ReactNode;
  icon: React.ReactNode;
  trend?: {
    value: number;
    positive: boolean;
  };
  variant?: "ultra-premium" | "frosted-premium";
  className?: string;
}

export default function PremiumStatCard({
  title,
  value,
  icon,
  trend,
  variant = "ultra-premium",
  className,
}: PremiumStatCardProps) {
  const { uiStyle } = useTheme();
  
  return (
    <Card variant={variant} className={cn("group transition-all duration-500", className)}>
      <CardContent className="p-8">
        <div className="flex justify-between items-start space-y-0">
          <div className="space-y-4 flex-grow">
            <p className="text-sm text-muted-foreground font-medium tracking-wide">
              {title}
            </p>
            <div className="flex items-baseline space-x-3">
              <CardTitle className="text-4xl font-light tracking-tight text-foreground 
                                 transition-colors duration-500">
                {value}
              </CardTitle>
              {trend && (
                <span
                  className={cn(
                    "flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 transition-all duration-500",
                    uiStyle === "minimal" ? "rounded-2xl" : "rounded-lg",
                    "border shadow-sm",
                    trend.positive 
                      ? "text-emerald-400 border-emerald-400/40 bg-emerald-400/15" 
                      : "text-red-400 border-red-400/40 bg-red-400/15"
                  )}
                >
                  {trend.positive ? (
                    <CaretUp size={12} weight="bold" />
                  ) : (
                    <CaretDown size={12} weight="bold" />
                  )}
                  <span className="text-xs font-semibold tracking-tight">
                    {trend.positive ? "+" : "-"}
                    {trend.value}%
                  </span>
                </span>
              )}
            </div>
          </div>
          <div className={cn(
            "w-16 h-16 flex items-center justify-center transition-all duration-500",
            "relative overflow-hidden",
            "bg-gradient-to-br from-primary/15 to-primary/8",
            "border border-primary/25",
            "group-hover:from-primary/20 group-hover:to-primary/12",
            "group-hover:border-primary/35",
            uiStyle === "minimal" ? "rounded-2xl" : "rounded-xl"
          )}>
            <div className="relative z-10 text-primary/90 group-hover:text-primary 
                          transition-colors duration-500">
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
