
import { useState, useEffect } from "react";
import { subDays, startOfDay, endOfDay } from "date-fns";

interface TimeRange {
  from: Date;
  to: Date;
  compareWith?: {
    from: Date;
    to: Date;
  };
}

interface UseTimeRangeProps {
  onRangeChange: (range: TimeRange) => void;
  initialRange?: {
    from: Date;
    to: Date;
  };
}

export function useTimeRange({ onRangeChange, initialRange }: UseTimeRangeProps) {
  const today = new Date();
  const [selectedPreset, setSelectedPreset] = useState("last_30_days");
  const [dateRange, setDateRange] = useState<TimeRange>(() => {
    if (initialRange) {
      return {
        from: initialRange.from,
        to: initialRange.to
      };
    }
    return {
      from: subDays(today, 30),
      to: today
    };
  });
  const [enableComparison, setEnableComparison] = useState(false);
  const [selectingCompareRange, setSelectingCompareRange] = useState(false);
  const [comparisonType, setComparisonType] = useState("previous_period");

  // Update date range when initialRange changes
  useEffect(() => {
    if (initialRange) {
      const newRange = {
        from: initialRange.from,
        to: initialRange.to
      };
      setDateRange(newRange);
      onRangeChange(newRange);
    }
  }, [initialRange, onRangeChange]);

  const updateComparisonRange = (mainRange: TimeRange, comparisonType: string) => {
    const daysDiff = Math.floor((mainRange.to.getTime() - mainRange.from.getTime()) / (1000 * 60 * 60 * 24));
    let compareFrom: Date, compareTo: Date;

    switch (comparisonType) {
      case "previous_period":
        compareFrom = new Date(mainRange.from);
        compareFrom.setDate(mainRange.from.getDate() - (daysDiff + 1));
        compareTo = new Date(mainRange.from);
        compareTo.setDate(compareTo.getDate() - 1);
        break;
      case "previous_year":
        compareFrom = new Date(mainRange.from);
        compareFrom.setFullYear(mainRange.from.getFullYear() - 1);
        compareTo = new Date(mainRange.to);
        compareTo.setFullYear(mainRange.to.getFullYear() - 1);
        break;
      case "custom":
        if (dateRange.compareWith) {
          compareFrom = dateRange.compareWith.from;
          compareTo = dateRange.compareWith.to;
        } else {
          compareFrom = new Date(mainRange.from);
          compareFrom.setDate(mainRange.from.getDate() - (daysDiff + 1));
          compareTo = new Date(mainRange.from);
          compareTo.setDate(compareTo.getDate() - 1);
        }
        break;
      default:
        return;
    }

    const newRange = {
      ...mainRange,
      compareWith: {
        from: compareFrom,
        to: compareTo
      }
    };

    setDateRange(newRange);
    onRangeChange(newRange);
    if (comparisonType !== "custom" || !selectingCompareRange) {
      return true; // Signal to close the popover
    }
    return false;
  };

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    let newFrom: Date, newTo: Date;

    switch (value) {
      case "today":
        newFrom = startOfDay(today);
        newTo = endOfDay(today);
        break;
      case "yesterday":
        newFrom = startOfDay(subDays(today, 1));
        newTo = endOfDay(subDays(today, 1));
        break;
      case "today_and_yesterday":
        newFrom = startOfDay(subDays(today, 1));
        newTo = endOfDay(today);
        break;
      case "last_7_days":
        newFrom = subDays(today, 7);
        newTo = today;
        break;
      case "last_14_days":
        newFrom = subDays(today, 14);
        newTo = today;
        break;
      case "last_30_days":
        newFrom = subDays(today, 30);
        newTo = today;
        break;
      case "this_week":
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());
        newFrom = startOfDay(thisWeekStart);
        newTo = today;
        break;
      case "last_week":
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        newFrom = startOfDay(lastWeekStart);
        newTo = endOfDay(lastWeekEnd);
        break;
      case "this_month":
        newFrom = new Date(today.getFullYear(), today.getMonth(), 1);
        newTo = today;
        break;
      case "last_month":
        newFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        newTo = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "maximum":
        newFrom = new Date(2020, 0, 1);
        newTo = today;
        break;
      case "custom":
        return false;
      default:
        return false;
    }

    const newRange = { from: newFrom, to: newTo };
    setDateRange(newRange);
    onRangeChange(newRange);

    if (enableComparison) {
      updateComparisonRange(newRange, comparisonType);
    }
    return true;
  };

  return {
    selectedPreset,
    dateRange,
    enableComparison,
    selectingCompareRange,
    comparisonType,
    setSelectedPreset,
    setDateRange,
    setEnableComparison,
    setSelectingCompareRange,
    setComparisonType,
    handlePresetChange,
    updateComparisonRange
  };
}
