import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, ChevronDown, Edit, Check, X, Sparkles, Database, Shield } from "lucide-react";
import { AnalysisData, StructuredDataField } from "./types";
import { IntelligentDataField } from "./IntelligentDataField";
import { DataFieldSuggestion, UNIVERSAL_DEFAULTS } from "@/utils/dataTypeInference";
import { cn } from "@/lib/utils";

interface AnalysisTabProps {
  data: AnalysisData;
  onChange: (data: Partial<AnalysisData>) => void;
}

interface ExtendedStructuredDataField extends StructuredDataField {
  required?: boolean;
  enumValues?: string[];
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({ data, onChange }) => {
  const [newField, setNewField] = useState<ExtendedStructuredDataField>({
    name: "",
    type: "string",
    description: "",
    required: false,
    enumValues: []
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Initialize with universal defaults if no data exists
  React.useEffect(() => {
    if (data.structuredData.length === 0) {
      const universalFields: StructuredDataField[] = UNIVERSAL_DEFAULTS.map(field => ({
        name: field.name,
        type: field.type,
        description: field.description,
        isUniversal: field.isUniversal,
        origin: field.origin
      }));
      
      onChange({
        structuredData: universalFields,
        structuredDataProperties: generateStructuredDataProperties(universalFields),
        structuredDataPrompt: generateStructuredDataPrompt(universalFields)
      });
    }
  }, []);

  const addDataField = (field: DataFieldSuggestion) => {
    const newStructuredField: StructuredDataField = {
      name: field.name,
      type: field.type,
      description: field.description,
      origin: field.origin || 'Custom'
    };
    
    const updatedFields = [...data.structuredData, newStructuredField];
    onChange({
      structuredData: updatedFields,
      structuredDataProperties: generateStructuredDataProperties(updatedFields),
      structuredDataPrompt: data.structuredDataPrompt || generateStructuredDataPrompt(updatedFields)
    });
  };

  const addStructuredDataField = () => {
    if (newField.name && newField.description) {
      const updatedFields = [...data.structuredData, { 
        name: newField.name,
        type: newField.type,
        description: newField.description 
      }];
      onChange({
        structuredData: updatedFields,
        structuredDataProperties: generateStructuredDataProperties(updatedFields),
        structuredDataPrompt: data.structuredDataPrompt || generateStructuredDataPrompt(updatedFields)
      });
      setNewField({ 
        name: "", 
        type: "string", 
        description: "",
        required: false,
        enumValues: []
      });
    }
  };

  const removeStructuredDataField = (index: number) => {
    const updatedFields = data.structuredData.filter((_, i) => i !== index);
    onChange({ 
      structuredData: updatedFields,
      structuredDataProperties: generateStructuredDataProperties(updatedFields),
      structuredDataPrompt: data.structuredDataPrompt || generateStructuredDataPrompt(updatedFields)
    });
  };

  const generateStructuredDataProperties = (fields: StructuredDataField[]) => {
    const properties: any = {};
    fields.forEach(field => {
      properties[field.name.toLowerCase().replace(/\s+/g, '_')] = {
        type: field.type,
        description: field.description,
        required: false
      };
    });
    return properties;
  };

  const generateStructuredDataPrompt = (fields: StructuredDataField[]) => {
    if (fields.length === 0) return "";
    
    const fieldDescriptions = fields.map(field => 
      `- ${field.name}: ${field.description}`
    ).join('\n');
    
    return `Extract the following structured data from the conversation:\n\n${fieldDescriptions}\n\nFor each field, provide the most relevant information mentioned during the call. If a field is not mentioned or not applicable, use null. Return the data in a structured format.`;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      string: "bg-primary/10 text-primary border-primary/20",
      number: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      boolean: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      object: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      array: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      date: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
    };
    return colors[type as keyof typeof colors] || colors.string;
  };

  return (
    <TooltipProvider>
      <div className="space-y-[var(--space-2xl)]">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-[28px] font-light tracking-[0.2px] mb-2">Analysis Configuration</h2>
          <p className="text-base text-muted-foreground max-w-xl">
            Configure how conversations are analyzed, structured, and evaluated for your business needs
          </p>
        </div>

        {/* Call Summaries Card */}
        <Card variant="default">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <h3 className="text-lg font-medium">Call Summaries</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose how calls are summarized
              </p>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-[var(--space-xl)]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Summary Style</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create summaries of your calls to capture key details, decisions, and next steps
                </p>
              </div>
              <Textarea
                placeholder="Create a brief, conversational call summary. Include what they're looking for, their key needs, and next steps. Keep it under 250 words with a conversational tone."
                value={data.callSummary || ""}
                onChange={(e) => onChange({ callSummary: e.target.value })}
                className="resize-none h-28 text-[15px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* What Makes a Call Successful Card */}
        <Card variant="default">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <h3 className="text-lg font-medium">What Makes a Call Successful</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose what makes calls successful for you
              </p>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-[var(--space-xl)]">
            <div className="space-y-4">
              <Label className="text-sm font-medium">Success Criteria Prompt</Label>
              <Textarea
                placeholder="Define what constitutes a successful call for your business. For example: 'A call is successful if the customer schedules an appointment, provides contact information, or shows interest in our services.'"
                value={data.customSuccessPrompt}
                onChange={(e) => onChange({ customSuccessPrompt: e.target.value })}
                className="resize-none h-24 text-[15px]"
              />
            </div>
          </CardContent>
        </Card>

      {/* What to Track Card */}
      <Card variant="default">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">What to Track</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose what information to capture from your calls
            </p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Natural Language Input */}
          <IntelligentDataField 
            onAdd={addDataField}
          />

          {/* Current Fields Display */}
          {data.structuredData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Currently Tracking</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {data.structuredData.length} item{data.structuredData.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {data.structuredData.map((field, index) => (
                  <Card key={index} className="group relative p-3 bg-card border border-border/60 hover:border-border hover:shadow-sm transition-all duration-200 rounded-lg min-h-[100px] flex flex-col">
                    {/* Remove button in top-right corner */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeStructuredDataField(index)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-5 w-5 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 z-10"
                      aria-label={`Remove ${field.name} field`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                    
                    {/* Main content */}
                    <div className="flex-1 flex flex-col justify-center space-y-2 pr-4 pb-6">
                      <h5 className="font-medium text-sm leading-tight">{field.name}</h5>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 cursor-help">
                            {field.description}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{field.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    
                    {/* Type badge in bottom-left corner */}
                    <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Badge 
                        variant="secondary"
                        className={cn("text-[9px] px-1 py-0.5 leading-none", getTypeColor(field.type))}
                      >
                        {field.type}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Add Business-Specific Fields
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Timeout Settings */}
      <Card variant="default">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <h3 className="text-lg font-medium">Analysis Timeout Settings</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure how long the AI should wait for analysis responses
            </p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Call Summary Timeout</Label>
              <Input
                type="number"
                placeholder="30"
                value={data.summaryTimeout || 30}
                onChange={(e) => onChange({ summaryTimeout: parseInt(e.target.value) || 30 })}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Seconds to wait for call summary generation
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Success Evaluation Timeout</Label>
              <Input
                type="number"
                placeholder="15"
                value={data.evaluationTimeout || 15}
                onChange={(e) => onChange({ evaluationTimeout: parseInt(e.target.value) || 15 })}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Seconds to wait for success evaluation
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Structured Data Timeout</Label>
              <Input
                type="number"
                placeholder="20"
                value={data.structuredDataTimeout || 20}
                onChange={(e) => onChange({ structuredDataTimeout: parseInt(e.target.value) || 20 })}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Seconds to wait for structured data extraction
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Structured Data Prompt Configuration */}
      <Card variant="default">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <h3 className="text-lg font-medium">Structured Data Extraction Prompt</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Advanced prompt for extracting structured data from conversations
            </p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Custom Extraction Prompt</Label>
            <Textarea
              placeholder="Enter a custom prompt for structured data extraction. This will be used by the AI to extract the fields you've configured above."
              value={data.structuredDataPrompt || ""}
              onChange={(e) => onChange({ structuredDataPrompt: e.target.value })}
              className="resize-none h-24 text-[15px]"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the auto-generated prompt based on your configured fields.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChange({ structuredDataPrompt: generateStructuredDataPrompt(data.structuredData) })}
                disabled={data.structuredData.length === 0}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Auto-Generate Prompt
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChange({ structuredDataPrompt: "" })}
                className="gap-2"
              >
                Clear Custom Prompt
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </TooltipProvider>
  );
};