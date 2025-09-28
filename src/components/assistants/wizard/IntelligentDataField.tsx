import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Check, X, AlertCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { inferDataType, DataFieldSuggestion } from "@/utils/dataTypeInference";

interface IntelligentDataFieldProps {
  onAdd: (field: DataFieldSuggestion) => void;
  businessType?: string;
}

export const IntelligentDataField: React.FC<IntelligentDataFieldProps> = ({ 
  onAdd, 
  businessType = "general" 
}) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<DataFieldSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const inferred = await inferDataType(input, businessType);
      setSuggestions(inferred);
    } catch (error) {
      console.error("Error analyzing input:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddField = (field: DataFieldSuggestion) => {
    onAdd(field);
    // Remove the added field from suggestions
    setSuggestions(prev => prev.filter(s => s.name !== field.name));
  };

  const handleClear = () => {
    setInput("");
    setSuggestions([]);
  };

  const handleDismissAll = () => {
    setSuggestions([]);
  };

  const handleDismissSuggestion = (fieldName: string) => {
    setSuggestions(prev => prev.filter(s => s.name !== fieldName));
  };

  const getTypeColor = (type: string, confidence: number) => {
    const baseColors = {
      string: "bg-primary/10 text-primary border-primary/20",
      number: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      boolean: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      object: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      array: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      date: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
    };
    
    const opacity = confidence < 0.7 ? "opacity-60" : "";
    return cn(baseColors[type as keyof typeof baseColors] || baseColors.string, opacity);
  };

  const examplePrompts = [
    "Customer email and phone number",
    "Appointment time and service needed",
    "Budget range and timeline",
    "Follow-up scheduling status"
  ];

  return (
    <div className="space-y-6">
      {/* Natural Language Input */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <Label className="text-sm font-medium">What would you like to track?</Label>
        </div>
        
        <div className="space-y-3">
          <Textarea
            placeholder="Customer email, appointment details, budget range..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="resize-none h-24 text-[15px]"
          />
          
          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={!input.trim() || isAnalyzing}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isAnalyzing ? "Creating..." : "Create Fields"}
            </Button>
            
            {(input || suggestions.length > 0) && (
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Example Prompts */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Popular choices:</span>
          </div>
          <div className="grid gap-2">
            {examplePrompts.slice(0, 2).map((example, index) => (
              <button
                key={index}
                onClick={() => setInput(example)}
                className="text-left text-xs text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-muted/50 border border-dashed border-muted-foreground/20"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-primary">Suggested Fields</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                {suggestions.length > 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      suggestions.forEach(field => handleAddField(field));
                    }}
                    className="h-7 px-3 text-xs"
                  >
                    Add All
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismissAll}
                  className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  Dismiss All
                </Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            {suggestions.map((field, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium text-sm text-foreground truncate">
                      {field.name}
                    </h5>
                    <Badge 
                      variant="secondary"
                      className={cn("text-[9px] px-1 py-0.5 leading-none", getTypeColor(field.type, field.confidence))}
                    >
                      {field.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {field.description}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDismissSuggestion(field.name);
                    }}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-all duration-200"
                    aria-label={`Dismiss ${field.name} suggestion`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddField(field);
                    }}
                    className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/10 transition-all duration-200"
                    aria-label={`Add ${field.name} to tracking`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

