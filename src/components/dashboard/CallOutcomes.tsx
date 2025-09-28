
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/typography";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomLegend } from "./call-outcomes/CustomLegend";
import { CustomTooltip } from "./call-outcomes/CustomTooltip";
import { prepareChartData } from "./call-outcomes/utils";
import { useBusinessUseCase } from "@/components/BusinessUseCaseProvider";
import { useDynamicOutcomeMapping } from "./call-outcomes/DynamicOutcomeMapping";

interface CallOutcomesProps {
  callOutcomes?: Record<string, number>;
  isLoading?: boolean;
}

export default function CallOutcomes({ callOutcomes = {}, isLoading = false }: CallOutcomesProps) {
  const { config } = useBusinessUseCase();
  const outcomeMapping = useDynamicOutcomeMapping();
  const chartData = prepareChartData(callOutcomes);
  const noData = chartData.length === 0 && !isLoading;

  return (
    <Card variant="glass" className="transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary/60 rounded-sm
                        shadow-[0_0_12px_rgba(255,74,113,0.4)]" />
          <CardTitle className="text-lg font-extralight tracking-tight">
            {config.chartTitles.callOutcomes}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="flex items-center gap-8">
              <Skeleton className="h-[180px] w-[180px] rounded-full bg-white/[0.04]" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-white/[0.04]" />
                    <Skeleton className="h-4 w-24 bg-white/[0.04]" />
                    <Skeleton className="h-4 w-12 bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : noData ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground text-center text-sm">
              No call outcome data available for the selected period.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-8 h-[300px]">
            {/* Donut Chart */}
            <div className="flex-shrink-0">
              <ResponsiveContainer width={220} height={220}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="flex-1 space-y-4">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex items-center justify-center w-9 h-9 rounded-full text-white flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.icon}
                    </div>
                    <span className="text-foreground text-sm font-medium">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-foreground text-lg font-light tabular-nums">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
