import React, { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { VariablePicker } from './VariablePicker';
import { Button } from '@/components/ui/button';
import { Code } from 'phosphor-react';
import { cn } from '@/lib/utils';

interface VariableInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  customVariables?: string[];
  triggerType?: string;
  multiline?: boolean;
  className?: string;
}

export function VariableInput({
  value,
  onChange,
  customVariables = [],
  triggerType,
  multiline = false,
  className,
  ...inputProps
}: VariableInputProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // Store cursor position for variable insertion
    setCursorPosition(e.target.selectionStart);
  };

  const handleVariableSelect = (variable: string) => {
    const input = inputRef.current;
    if (!input) return;

    // Get current cursor position or use stored position
    const cursorPos = cursorPosition !== null ? cursorPosition : input.selectionStart || value.length;

    // Insert variable at cursor position
    const newValue = value.slice(0, cursorPos) + variable + value.slice(cursorPos);
    onChange(newValue);

    // Set cursor position after inserted variable
    setTimeout(() => {
      const newCursorPos = cursorPos + variable.length;
      if (input.setSelectionRange) {
        input.setSelectionRange(newCursorPos, newCursorPos);
        input.focus();
      }
    }, 0);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCursorPosition(e.target.selectionStart);
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCursorPosition((e.target as HTMLInputElement | HTMLTextAreaElement).selectionStart);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCursorPosition((e.target as HTMLInputElement | HTMLTextAreaElement).selectionStart);
  };

  return (
    <div className="relative group">
      {multiline ? (
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onClick={handleClick}
          onKeyUp={handleKeyUp}
          className={cn("pr-12 rounded-2xl bg-black/20 border-white/5 focus:ring-primary/20 resize-none", className)}
          {...(inputProps as any)}
        />
      ) : (
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onClick={handleClick}
          onKeyUp={handleKeyUp}
          className={cn("pr-12 rounded-full bg-black/20 border-white/5 focus:ring-primary/20", className)}
          {...inputProps}
        />
      )}
      <div className={cn(
        "absolute right-2 flex items-center",
        multiline ? "top-3" : "top-1/2 -translate-y-1/2"
      )}>
        <VariablePicker onSelect={handleVariableSelect} customVariables={customVariables} triggerType={triggerType}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-white/10 text-primary/70 hover:text-primary transition-all duration-200"
          >
            <Code size={16} weight="bold" />
          </Button>
        </VariablePicker>
      </div>
    </div>
  );
}
