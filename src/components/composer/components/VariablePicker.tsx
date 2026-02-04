import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getVariableRegistry, formatVariableKey, type VariableCategory, type Variable } from '../utils/variableRegistry';
import { MagnifyingGlass, Code, CornersOut, Browsers, Minus, Microphone, IdentificationCard, CaretUp, CaretDown } from 'phosphor-react';
import { cn } from '@/lib/utils';

interface VariablePickerProps {
  onSelect: (variable: string) => void;
  customVariables?: string[]; // Custom variables from trigger node
  triggerType?: string; // Type of trigger (e.g., 'hubspot_contact_created')
  children?: React.ReactNode;
}

export function VariablePicker({ onSelect, customVariables = [], triggerType, children }: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'contact_info': true,
    'call_data': true,
    'hubspot_contact': true,
    'facebook_lead': true
  });

  const registry = getVariableRegistry(triggerType);

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
            className="h-7 w-7 p-0 border-dashed border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all rounded-md"
            title="Insert Variable"
          >
            <Code size={14} weight="bold" className="text-primary/80" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[340px] p-0 shadow-2xl border-border/10 rounded-xl overflow-hidden backdrop-blur-3xl"
        align="start"
        side="bottom"
        sideOffset={8}
      >
        <div className="flex flex-col bg-background/95">
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-border/10 bg-muted/20">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Data Selector</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                {registry.reduce((acc, cat) => acc + cat.variables.length, 0)} Vars
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="p-2 border-b border-border/10 bg-background/50">
            <div className="relative group">
              <MagnifyingGlass
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors"
              />
              <Input
                placeholder="Search variables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/30 border-transparent hover:bg-muted/50 focus:bg-background focus:border-primary/20 transition-all rounded-lg"
              />
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="h-72 overscroll-contain">
            <div className="p-2 space-y-1">
              {filteredRegistry.map((category) => (
                <div key={category.id} className="rounded-lg overflow-hidden border border-border/5 bg-white/[0.02]">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center text-[10px]",
                        category.id === 'call_data' ? "bg-indigo-500/10 text-indigo-400" :
                          category.id === 'contact_info' ? "bg-emerald-500/10 text-emerald-400" :
                            category.id === 'custom_variables' ? "bg-amber-500/10 text-amber-400" :
                              "bg-primary/10 text-primary"
                      )}>
                        {category.id === 'call_data' ? <Microphone weight="fill" /> :
                          category.id === 'contact_info' ? <IdentificationCard weight="bold" /> :
                            category.id === 'custom_variables' ? <Code weight="bold" /> :
                              <Browsers weight="duotone" />}
                      </div>
                      <span className="text-xs font-semibold text-foreground/90">
                        {category.label}
                      </span>
                    </div>
                    {expandedCategories[category.id] ?
                      <CaretUp size={12} className="text-muted-foreground/50" /> :
                      <CaretDown size={12} className="text-muted-foreground/50" />
                    }
                  </button>

                  {expandedCategories[category.id] && (
                    <div className="px-1 py-1 bg-black/20 space-y-0.5">
                      {category.variables.map((variable) => (
                        <button
                          key={variable.key}
                          className="w-full text-left group flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
                          onClick={() => handleVariableSelect(variable)}
                        >
                          <div className="flex flex-col gap-0.5 overflow-hidden">
                            <span className="text-[11px] font-medium text-foreground/70 group-hover:text-primary truncate">
                              {variable.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground/40 font-mono truncate group-hover:text-primary/60">
                              {variable.example || `{${variable.key}}`}
                            </span>
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 p-1 text-primary">
                            <CornersOut size={12} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {filteredRegistry.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground/40 italic">
                    No variables found
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
