
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "lucide-react";
import CallVolumeChart from "./call-analytics/CallVolumeChart";
import { useCallVolumeData } from "./call-analytics/useCallVolumeData";

interface CallAnalyticsProps {
  dateRange?: {
    from: Date;
    to: Date;
    compareWith?: { from: Date; to: Date };
  };
  callLogs?: any[];
}

export default function CallAnalytics({ dateRange, callLogs = [] }: CallAnalyticsProps) {
  const chartData = useCallVolumeData({ dateRange, callLogs });

  return (
    <Card variant="glass" className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center liquid-space-md text-lg font-extralight">
          <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary/60 liquid-rounded-sm
                        shadow-[0_0_12px_rgba(255,74,113,0.4)]"></div>
          <span className="text-liquid">Call Volume</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[350px] pt-4">
        <CallVolumeChart chartData={chartData} />
      </CardContent>
    </Card>
  );
}
