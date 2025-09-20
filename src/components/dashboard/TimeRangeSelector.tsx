
import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { PresetSelector } from "./time-range/PresetSelector";
import { ComparisonSelector } from "./time-range/ComparisonSelector";
import { useTimeRange } from "@/hooks/useTimeRange";
import { presets } from "./time-range/presets";

interface TimeRangeSelectorProps {
  onRangeChange: (range: {
    from: Date;
    to: Date;
    compareWith?: {
      from: Date;
      to: Date;
    };
  }) => void;
  initialRange?: {
    from: Date;
    to: Date;
  };
}

export default function TimeRangeSelector({ onRangeChange, initialRange }: TimeRangeSelectorProps) {
  const [open, setOpen] = useState(false);

  const {
    selectedPreset,
    dateRange,
    enableComparison,
    selectingCompareRange,
    comparisonType,
    setDateRange,
    setEnableComparison,
    setSelectingCompareRange,
    setComparisonType,
    handlePresetChange,
    updateComparisonRange
  } = useTimeRange({ onRangeChange, initialRange });

  const formatDateDisplay = () => {
    if (selectedPreset !== "custom") {
      return presets.find(p => p.value === selectedPreset)?.label || "Select timeframe";
    }
    return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (selectingCompareRange) {
      const compareRange = dateRange.compareWith || { from: date, to: date };

      if (!compareRange.from || isSameDay(compareRange.from, date)) {
        compareRange.from = date;
        compareRange.to = date;
      } else if (!compareRange.to || compareRange.from && compareRange.to) {
        if (date < compareRange.from) {
          compareRange.to = compareRange.from;
          compareRange.from = date;
        } else {
          compareRange.to = date;
        }
        if (compareRange.from && compareRange.to) {
          const newRange = { ...dateRange, compareWith: compareRange };
          setDateRange(newRange);
          onRangeChange(newRange);
        }
      }
    } else {
      const newRange = {
        from: !dateRange.from || isSameDay(dateRange.from, date) || dateRange.to ? date : dateRange.from,
        to: dateRange.from && !isSameDay(dateRange.from, date) ? date : dateRange.to,
        compareWith: dateRange.compareWith
      };

      if (newRange.from && newRange.to) {
        if (newRange.from > newRange.to) {
          [newRange.from, newRange.to] = [newRange.to, newRange.from];
        }
        if (enableComparison) {
          updateComparisonRange(newRange, comparisonType);
        } else {
          setDateRange(newRange);
          onRangeChange(newRange);
          setOpen(false);
        }
      } else {
        setDateRange(newRange as { from: Date; to: Date; compareWith?: { from: Date; to: Date } });
      }
    }
  };

  const handleToggleComparison = (checked: boolean) => {
    setEnableComparison(checked);
    if (checked) {
      updateComparisonRange(dateRange, comparisonType);
    } else {
      const newRange = { ...dateRange };
      delete newRange.compareWith;
      setDateRange(newRange);
      onRangeChange(newRange);
    }
  };

  const handleComparisonTypeChange = (value: string) => {
    setComparisonType(value);
    if (value === "custom") {
      setSelectingCompareRange(true);
    } else {
      setSelectingCompareRange(false);
      updateComparisonRange(dateRange, value);
    }
  };

  const handlePresetSelect = (value: string) => {
    const shouldClose = handlePresetChange(value);
    if (shouldClose && value !== "custom") {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="btn-glass-light h-12 px-4 text-foreground">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-foreground/70" />
            <span className="text-sm font-medium">{formatDateDisplay()}</span>
            <ChevronDown className="h-3 w-3 text-foreground/50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="popover-glass w-auto p-0 shadow-2xl" align="end">
        <div className="flex flex-col md:flex-row">
          <div className="border-b md:border-b-0 md:border-r border-[hsl(var(--glass-border-periwinkle))] dark:border-[hsl(var(--glass-border-bluish))] p-6 bg-[hsl(var(--glass-periwinkle-light))] dark:bg-[hsl(var(--glass-bluish-light))]">
            <PresetSelector
              selectedPreset={selectedPreset}
              onPresetChange={handlePresetSelect}
            />
          </div>

          <div className="p-6 space-y-6">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={selectingCompareRange ? {
                from: dateRange.compareWith?.from,
                to: dateRange.compareWith?.to
              } : {
                from: dateRange.from,
                to: dateRange.to
              }}
              onSelect={range => {
                if (range?.from) handleDateSelect(range.from);
                if (range?.to) handleDateSelect(range.to);
              }}
              numberOfMonths={2}
              className="pointer-events-auto liquid-rounded-lg"
              disabled={date => date > new Date()}
            />

            <div className="border-t border-[hsl(var(--glass-border-periwinkle))] dark:border-[hsl(var(--glass-border-bluish))] pt-6">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="compare"
                  checked={enableComparison}
                  onCheckedChange={handleToggleComparison}
                  className="border-primary/60 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground liquid-rounded-sm"
                />
                <Label htmlFor="compare" className="font-medium text-foreground cursor-pointer">
                  Compare with previous period
                </Label>
              </div>

              {enableComparison && (
                <ComparisonSelector
                  comparisonType={comparisonType}
                  onComparisonTypeChange={handleComparisonTypeChange}
                  selectingCompareRange={selectingCompareRange}
                  onToggleCompareRangeSelect={() => setSelectingCompareRange(!selectingCompareRange)}
                  compareWith={dateRange.compareWith}
                />
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-[hsl(var(--glass-border-periwinkle))] dark:border-[hsl(var(--glass-border-bluish))]">
              <p className="text-xs text-muted-foreground/70 self-center">
                Dates are shown in local time
              </p>
              <div className="space-x-3">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="btn-glass-light h-9 px-4 text-sm">
                  Cancel
                </Button>
                <Button size="sm" onClick={() => setOpen(false)} className="h-9 px-4 text-sm liquid-rounded-lg bg-primary hover:bg-primary/90">
                  Update
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
