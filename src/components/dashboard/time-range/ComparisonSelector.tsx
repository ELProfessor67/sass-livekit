
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface ComparisonSelectorProps {
  comparisonType: string;
  onComparisonTypeChange: (value: string) => void;
  selectingCompareRange: boolean;
  onToggleCompareRangeSelect: () => void;
  compareWith?: { from: Date; to: Date };
}

export function ComparisonSelector({ 
  comparisonType, 
  onComparisonTypeChange,
  selectingCompareRange,
  onToggleCompareRangeSelect,
  compareWith
}: ComparisonSelectorProps) {
  const formatDateRange = (range: { from: Date; to: Date }) => {
    return `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`;
  };

  return (
    <div className="mt-4 space-y-4">
      <RadioGroup value={comparisonType} className="space-y-2" onValueChange={onComparisonTypeChange}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="previous_period" id="previous_period" className="border-primary text-primary" />
          <Label htmlFor="previous_period" className="text-sm">Previous period</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="previous_year" id="previous_year" className="border-primary text-primary" />
          <Label htmlFor="previous_year" className="text-sm">Previous year</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="custom" id="custom_range" className="border-primary text-primary" />
          <Label htmlFor="custom_range" className="text-sm">Custom</Label>
        </div>
      </RadioGroup>
      
      {comparisonType === "custom" && (
        <div className="pl-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onToggleCompareRangeSelect}
            className="text-xs"
          >
            {selectingCompareRange ? "Select main range" : "Select comparison range"}
          </Button>
          {compareWith && (
            <p className="text-xs text-muted-foreground mt-2">
              Comparing with: {formatDateRange(compareWith)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
