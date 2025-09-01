
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CallVolumeChartProps {
  chartData: any[];
}

export default function CallVolumeChart({ chartData }: CallVolumeChartProps) {
  // Find the max value in the chart data for better Y axis scaling
  const maxValue = Math.max(...chartData.map(item => item.value || 0));
  const minValue = Math.min(...chartData.map(item => item.value || 0));
  
  // Calculate a sensible Y axis range that makes the chart look wavy
  const yAxisMax = Math.ceil(maxValue * 1.15); // Make chart use ~85% of vertical space
  const yAxisMin = Math.max(0, Math.floor(minValue * 0.8)); // Allow some space at bottom to emphasize waves
  
  // Calculate a good tick count (4-6 ticks usually works well)
  const tickCount = 5; 

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false}
          padding={{ left: 10, right: 10 }}
          stroke="#a5b4fc"
          tick={{ fill: 'currentColor', fontSize: 12 }}
          className="axis-labels"
          // For short date ranges, don't show all days
          interval={chartData.length > 14 ? Math.ceil(chartData.length / 10) - 1 : 0}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          domain={[yAxisMin, yAxisMax]}
          padding={{ top: 20 }}
          stroke="#a5b4fc"
          tick={{ fill: 'currentColor', fontSize: 12 }}
          className="axis-labels"
          width={30}
          tickCount={tickCount}
        />
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(165, 180, 252, 0.2)" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "var(--popover)", 
            borderRadius: "8px", 
            color: "var(--popover-foreground)", 
            border: "1px solid rgba(79, 70, 229, 0.2)",
            padding: "8px 12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}
          itemStyle={{ color: "var(--popover-foreground)" }}
          labelStyle={{ marginBottom: "5px", fontWeight: "bold" }}
          formatter={(value: number) => [`${value}`, "Calls"]}
          labelFormatter={(label: string) => {
            const item = chartData.find(item => item.name === label);
            return item ? item.date : label;
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#00E5FF"
          fillOpacity={1}
          fill="url(#colorCall)"
          strokeWidth={2}
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
