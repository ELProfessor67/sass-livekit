import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, ChevronDown, Edit, Check, X } from "lucide-react";
import { AnalysisData, StructuredDataField } from "./types";
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

  const addStructuredDataField = () => {
    if (newField.name && newField.description) {
      onChange({
        structuredData: [...data.structuredData, { 
          name: newField.name,
          type: newField.type,
          description: newField.description 
        }]
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
    onChange({ structuredData: updatedFields });
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
    <div className="space-y-[var(--space-2xl)]">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-[28px] font-light tracking-[0.2px] mb-2">Analysis Configuration</h2>
        <p className="text-base text-muted-foreground max-w-xl">
          Configure how conversations are analyzed, structured, and evaluated for your business needs
        </p>
      </div>

      {/* Summary Settings Card */}
      <Card variant="default">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <h3 className="text-lg font-medium">Summary Settings</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure automatic call summarization features
            </p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-[var(--space-xl)]">
          <div className="space-y-4">
            <Label className="text-sm font-medium">Call Summary</Label>
            <Textarea
              placeholder="Configure how call summaries should be generated. Define the key points, format, and level of detail you want in automated summaries..."
              value={data.callSummary ? "Enabled" : ""}
              onChange={() => {}}
              className="resize-none h-28 text-[15px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Business Evaluation Card */}
      <Card variant="default">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <h3 className="text-lg font-medium">Business Evaluation</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Define success criteria and evaluation parameters
            </p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-[var(--space-xl)]">
          <div className="space-y-4">
            <Label className="text-sm font-medium">Custom Success Prompt</Label>
            <Textarea
              placeholder="Define what constitutes a successful call for your business. For example: 'A call is successful if the customer schedules an appointment, provides contact information, or shows interest in our services.'"
              value={data.customSuccessPrompt}
              onChange={(e) => onChange({ customSuccessPrompt: e.target.value })}
              className="resize-none h-24 text-[15px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Structured Data Card */}
      <Card variant="default">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <h3 className="text-lg font-medium">Structured Data</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Define data fields to extract from conversations
            </p>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-[var(--space-xl)]">
          {/* Data Schema Section */}
          <div className="pt-2">
            <div className="mb-4">
              <h4 className="text-sm font-medium">Data Schema</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Configure structured fields to extract and validate from call data
              </p>
            </div>

            {/* Property List */}
            {data.structuredData.length > 0 ? (
              <div className="space-y-2">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 py-2 px-1 text-xs font-medium text-muted-foreground border-b">
                  <div className="col-span-3">NAME</div>
                  <div className="col-span-2">TYPE</div>
                  <div className="col-span-5">OPTIONS</div>
                  <div className="col-span-2">ACTIONS</div>
                </div>

                {/* Property Rows */}
                {data.structuredData.map((field, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 bg-background/50 rounded-md border hover:shadow-sm transition-shadow">
                    {/* Name */}
                    <div className="col-span-3 font-medium text-sm">
                      {field.name}
                    </div>
                    
                    {/* Type Badge */}
                    <div className="col-span-2">
                      <Badge 
                        variant="secondary"
                        className={cn("text-xs", getTypeColor(field.type))}
                      >
                        {field.type}
                      </Badge>
                    </div>
                    
                    {/* Options */}
                    <div className="col-span-5 flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    </div>
                    
                    {/* Actions */}
                    <div className="col-span-2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStructuredDataField(index)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Empty State
              <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed rounded-md bg-muted/30">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  No structured data fields defined
                </p>
                <p className="text-xs text-muted-foreground">
                  Add fields to extract structured information from conversations
                </p>
              </div>
            )}

            {/* Add Property Form */}
            <div className="grid grid-cols-12 gap-3 items-center mb-3 mt-4 p-3 bg-muted/30 rounded-md border">
              {/* Name Input */}
              <div className="col-span-3">
                <Input
                  placeholder="Field name"
                  value={newField.name}
                  onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              
              {/* Type Select */}
              <div className="col-span-2">
                <Select 
                  value={newField.type} 
                  onValueChange={(value) => setNewField({ ...newField, type: value })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="object">Object</SelectItem>
                    <SelectItem value="array">Array</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Options */}
              <div className="col-span-5 flex items-center gap-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="required"
                    checked={newField.required}
                    onCheckedChange={(checked) => setNewField({ ...newField, required: checked })}
                  />
                  <Label htmlFor="required" className="text-sm">Required</Label>
                </div>
              </div>
              
              {/* Actions */}
              <div className="col-span-2 flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addStructuredDataField}
                  disabled={!newField.name || !newField.description}
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewField({ 
                    name: "", 
                    type: "string", 
                    description: "",
                    required: false,
                    enumValues: []
                  })}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Description for new field */}
            <div className="mt-2">
              <Textarea
                placeholder="Field description (what information should be extracted)"
                value={newField.description}
                onChange={(e) => setNewField({ ...newField, description: e.target.value })}
                className="resize-none h-16 text-sm"
              />
            </div>

            {/* Add Property Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addStructuredDataField}
              disabled={!newField.name || !newField.description}
              className="mt-4"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Property
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};