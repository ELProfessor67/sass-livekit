
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CardTitle, LabelText } from "@/components/ui/typography";
import { HeatmapGrid } from "./call-analytics/heatmap/HeatmapGrid";
import { useProcessHeatmapData } from "./call-analytics/useProcessHeatmapData";
import { DAYS, TIME_LABELS } from "./call-analytics/heatmap/constants";

interface CallTimeHeatmapProps {
  callLogs?: any[];
}

export default function CallTimeHeatmap({ callLogs = [] }: CallTimeHeatmapProps) {
  const heatmapData = useProcessHeatmapData(callLogs);

  return (
    <Card variant="glass" className="transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary/60 rounded-sm
                        shadow-[0_0_12px_rgba(255,74,113,0.4)]"></div>
          <CardTitle>Call Volume by Time of Day</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="w-full h-[340px] relative">
          {/* Y-axis labels (hours) */}
          <div className="absolute left-0 top-2 bottom-8 flex flex-col justify-between pr-4">
            {TIME_LABELS.map((label, index) => (
              <div key={`hour-${index}`} className="h-6 flex items-center">
                <LabelText>{label}</LabelText>
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="ml-16 h-[calc(100%-32px)] p-2">
            <HeatmapGrid heatmapData={heatmapData} />
          </div>
          
          {/* X-axis labels (days) */}
          <div className="absolute bottom-0 left-16 right-0 grid grid-cols-7 gap-1 px-2">
            {DAYS.map((day, index) => (
              <div key={`day-${index}`} className="text-center w-9">
                <LabelText>{day}</LabelText>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
