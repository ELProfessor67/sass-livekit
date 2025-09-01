
import { Phone, Timer, Calendar, ChartLineUp, CheckCircle, ShoppingCart, FileText, User } from "phosphor-react";
import StatCard from "@/components/dashboard/StatCard";
import { MetricText, MetricLabel } from "@/components/ui/typography";
import { secondsToDuration } from "@/lib/api/mockData/helpers";
import { useBusinessUseCase } from "@/components/BusinessUseCaseProvider";

interface DashboardStatsProps {
  totalCalls: number;
  avgDuration: number;
  appointments: number;
  bookingRate: number;
}

export function formatDuration(seconds: number) {
  return secondsToDuration(seconds);
}

export default function DashboardStats({ 
  totalCalls, 
  avgDuration, 
  appointments, 
  bookingRate 
}: DashboardStatsProps) {
  const { config } = useBusinessUseCase();
  
  // Icon mapping for dynamic metrics
  const iconMap: Record<string, any> = {
    Phone,
    Timer,
    Calendar,
    ChartLineUp,
    CheckCircle,
    ShoppingCart,
    UserCheck: User,
    FileText
  };
  
  // Value formatting function
  const formatValue = (value: number, format: string) => {
    switch (format) {
      case "duration":
        return formatDuration(value);
      case "percentage":
        return `${value}%`;
      case "currency":
        return `$${value.toLocaleString()}`;
      default:
        return value.toString();
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {config.metrics.map((metric, index) => {
        const IconComponent = iconMap[metric.icon] || Phone;
        let value: number;
        
        // Map the data based on metric key
        switch (metric.key) {
          case "totalCalls":
            value = totalCalls;
            break;
          case "avgDuration":
            value = avgDuration;
            break;
          case "appointments":
          case "resolved":
          case "interviews":
          case "orders":
          case "successful":
            value = appointments;
            break;
          case "bookingRate":
          case "resolutionRate":
          case "conversionRate":
          case "successRate":
            value = bookingRate;
            break;
          default:
            value = 0;
        }

        return (
          <StatCard
            key={metric.key}
            title={<MetricLabel className="text-elegant">{metric.label}</MetricLabel>}
            value={<MetricText className="text-display">{formatValue(value, metric.format)}</MetricText>}
            icon={<IconComponent size={24} weight="thin" />}
            trend={{ value: 18 - index * 2, positive: true }}
          />
        );
      })}
    </div>
  );
}
