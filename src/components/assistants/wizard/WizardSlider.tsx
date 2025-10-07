import React from "react";
import { Slider } from "@/components/ui/slider";

interface WizardSliderProps {
  value?: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  leftLabel?: string;
  rightLabel?: string;
  showValue?: boolean;
}

export const WizardSlider: React.FC<WizardSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
  leftLabel,
  rightLabel,
  showValue = true,
}) => {
  // Ensure value is a valid number
  const numericValue = typeof value === 'number' && !isNaN(value) ? value : min;
  
  return (
    <div className="space-y-[var(--space-md)]">
      <div className="flex items-center justify-between">
        {leftLabel && (
          <span className="text-[var(--text-xs)] text-theme-secondary font-[var(--font-normal)]">
            {leftLabel}
          </span>
        )}
        {showValue && (
          <span className="text-[var(--text-sm)] font-[var(--font-medium)] text-theme-primary">
            {numericValue.toFixed(step < 1 ? 1 : 0)}
          </span>
        )}
        {rightLabel && (
          <span className="text-[var(--text-xs)] text-theme-secondary font-[var(--font-normal)]">
            {rightLabel}
          </span>
        )}
      </div>
      <Slider
        value={[numericValue]}
        onValueChange={([newValue]) => onChange(newValue)}
        min={min}
        max={max}
        step={step}
        className="w-full"
        trackClassName="liquid-glass-light h-2"
        thumbClassName="liquid-glass-medium border-primary/60 shadow-[var(--shadow-glass-sm)] hover:shadow-[var(--shadow-glass-md)] transition-all duration-200"
      />
    </div>
  );
};