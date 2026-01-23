import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getVariableRegistry, formatVariableKey, type VariableCategory, type Variable } from '../utils/variableRegistry';
import { MagnifyingGlass, Code, CornersOut, Browsers, Minus, Microphone, CaretUp, CaretDown } from 'phosphor-react';
import { cn } from '@/lib/utils';

interface VariablePickerProps {
  onSelect: (variable: string) => void;
  customVariables?: string[]; // Custom variables from trigger node
  children?: React.ReactNode;
}

export function VariablePicker({ onSelect, customVariables = [], children }: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ 'call_data': true });

  const registry = getVariableRegistry();

  // Enhance registry with custom variables
  const enhancedRegistry = registry.map(category => {
    if (category.id === 'custom_variables' && customVariables.length > 0) {
      return {
        ...category,
        variables: customVariables.map(key => ({
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: `Custom variable: ${key}`,
          example: `{${key}}`
        }))
      };
    }
    return category;
  });

  // Filter categories and variables based on search
  const filteredRegistry = enhancedRegistry.map(category => {
    if (searchQuery) {
      const filteredVars = category.variables.filter(v =>
        v.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { ...category, variables: filteredVars };
    }
    return category;
  }).filter(category => category.variables.length > 0);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleVariableSelect = (variable: Variable) => {
    const formatted = formatVariableKey(variable.key);
    onSelect(formatted);
    // Keep it open if user wants to insert multiple? Or close if that's standard.
    // Screenshot implies it might stay open, but close is safer for single inserts.
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 border-primary/20 hover:bg-primary/5 hover:border-primary/40"
            title="Insert Variable"
          >
            <Code size={14} weight="bold" className="text-primary" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[500px] p-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/10 rounded-2xl overflow-hidden backdrop-blur-2xl"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <div className="flex flex-col h-[550px] bg-black/80">
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground/90">Data Selector</h3>
            <div className="flex items-center gap-4 text-muted-foreground/60">
              <CornersOut size={18} className="cursor-pointer hover:text-foreground transition-colors" />
              <Browsers size={18} className="cursor-pointer hover:text-foreground transition-colors" />
              <Minus size={18} className="cursor-pointer hover:text-foreground transition-colors" />
            </div>
          </div>

          {/* Search */}
          <div className="px-5 pb-4">
            <div className="relative group">
              <MagnifyingGlass
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors"
              />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 text-sm bg-muted/20 border-border/40 hover:border-border/60 focus:border-primary/50 focus:ring-0 rounded-lg transition-all"
              />
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="px-2 pb-6">
              {filteredRegistry.map((category) => (
                <div key={category.id} className="mb-2">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-4 px-5 hover:bg-white/5 rounded-xl transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary/80 group-hover:text-primary transition-colors border border-white/5">
                        {category.id === 'call_data' ? <Microphone size={20} weight="fill" /> : <Code size={20} weight="bold" />}
                      </div>
                      <span className="text-[15px] font-bold text-foreground/80 tracking-tight">
                        {category.id === 'call_data' ? `1. End Of Call Report` : category.label}
                      </span>
                    </div>
                    {expandedCategories[category.id] ? <CaretUp size={18} className="text-muted-foreground/40" /> : <CaretDown size={18} className="text-muted-foreground/40" />}
                  </button>

                  {expandedCategories[category.id] && (
                    <div className="mt-1 space-y-1 px-4">
                      {category.variables.map((variable) => (
                        <div
                          key={variable.key}
                          className={cn(
                            "group flex items-center justify-between px-14 py-4 rounded-xl transition-all duration-200",
                            "hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/5"
                          )}
                          onClick={() => handleVariableSelect(variable)}
                        >
                          <div className="flex items-baseline gap-2">
                            <span className="text-[14px] font-bold text-foreground/50">{variable.label} :</span>
                            <span className="text-[14px] font-bold text-blue-500/90 tracking-tight">
                              {variable.example || `{${variable.key}}`}
                            </span>
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 px-4 py-1.5 text-xs font-bold text-primary transition-all bg-primary/10 rounded-lg">
                            Insert
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {filteredRegistry.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground/50 italic">
                    No matching variables found
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
