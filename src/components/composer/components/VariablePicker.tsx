import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getVariableRegistry, formatVariableKey, type VariableCategory, type Variable } from '../utils/variableRegistry';
import { MagnifyingGlass, Code } from 'phosphor-react';
import { cn } from '@/lib/utils';

interface VariablePickerProps {
  onSelect: (variable: string) => void;
  customVariables?: string[]; // Custom variables from trigger node
  children?: React.ReactNode;
}

export function VariablePicker({ onSelect, customVariables = [], children }: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  const handleVariableSelect = (variable: Variable) => {
    const formatted = formatVariableKey(variable.key);
    onSelect(formatted);
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
        className="w-[420px] p-0" 
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <div className="flex flex-col h-[500px]">
          {/* Header */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Code size={16} weight="bold" className="text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Insert Variable
              </h3>
            </div>
            <div className="relative">
              <MagnifyingGlass 
                size={14} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" 
              />
              <Input
                placeholder="Search variables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-muted/30 border-border/50"
              />
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {filteredRegistry.map((category) => (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                      {category.label}
                    </h4>
                    {category.description && (
                      <span className="text-[10px] text-muted-foreground/50">
                        {category.variables.length} available
                      </span>
                    )}
                  </div>
                  {category.description && (
                    <p className="text-[10px] text-muted-foreground/50 mb-2">
                      {category.description}
                    </p>
                  )}
                  <div className="space-y-1">
                    {category.variables.map((variable) => (
                      <button
                        key={variable.key}
                        onClick={() => handleVariableSelect(variable)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg border transition-all",
                          "bg-muted/20 border-border/30 hover:bg-primary/5 hover:border-primary/30",
                          "group"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-xs font-mono text-primary font-semibold">
                                {formatVariableKey(variable.key)}
                              </code>
                            </div>
                            <p className="text-[11px] font-medium text-foreground/90 mb-0.5">
                              {variable.label}
                            </p>
                            {variable.description && (
                              <p className="text-[10px] text-muted-foreground/60 line-clamp-1">
                                {variable.description}
                              </p>
                            )}
                            {variable.example && (
                              <p className="text-[9px] text-muted-foreground/40 mt-1 font-mono">
                                Example: {variable.example}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {filteredRegistry.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground/60">
                    No variables found matching "{searchQuery}"
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
