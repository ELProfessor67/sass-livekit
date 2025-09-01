
import { BarChart3 } from "lucide-react";
import { SubHeading, SecondaryText } from "@/components/ui/typography";

interface DashboardHeaderProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  onRangeChange?: (range: { 
    from: Date; 
    to: Date; 
    compareWith?: { from: Date; to: Date } 
  }) => void;
}

export default function DashboardHeader({ dateRange, onRangeChange }: DashboardHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <SubHeading className="flex items-center gap-2">
          <BarChart3 className="text-primary" size={18} />
          <span>Key Performance Metrics</span>
        </SubHeading>
        
        <div className="text-right hidden md:block">
          <SecondaryText>
            {dateRange.from && dateRange.to ? 
              `Data shown for ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}` : 
              'Select a date range to view data'
            }
          </SecondaryText>
        </div>
      </div>
    </>
  );
}
