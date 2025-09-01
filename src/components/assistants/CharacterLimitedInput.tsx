import React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CharacterLimitedInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  className?: string;
}

export function CharacterLimitedInput({
  value,
  onChange,
  maxLength,
  placeholder,
  className,
}: CharacterLimitedInputProps) {
  const remainingChars = maxLength - value.length;
  const isNearLimit = remainingChars <= 5;
  const isAtLimit = remainingChars <= 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "pr-16 transition-all duration-200",
          isNearLimit && !isAtLimit && "border-amber-400/60 focus-visible:border-amber-400/80",
          isAtLimit && "border-destructive/60 focus-visible:border-destructive/80",
          className
        )}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none">
        <span
          className={cn(
            "transition-colors duration-200",
            isNearLimit && !isAtLimit && "text-amber-500",
            isAtLimit && "text-destructive",
            !isNearLimit && "text-muted-foreground"
          )}
        >
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}