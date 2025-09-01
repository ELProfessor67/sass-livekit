import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ModelData } from "./types";
import { WizardSlider } from "./WizardSlider";
import { Input } from "@/components/ui/input";

interface ModelTabProps {
  data: ModelData;
  onChange: (data: Partial<ModelData>) => void;
}

export const ModelTab: React.FC<ModelTabProps> = ({ data, onChange }) => {
  const [isTranscriberOpen, setIsTranscriberOpen] = React.useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[540px]">
      {/* Left Column - Main Content */}
      <div className="lg:col-span-8 flex flex-col">
        <div className="flex-1 space-y-6">
          {/* Header Section */}
          <div className="mb-6">
            <h2 className="text-[28px] font-light tracking-[0.2px] mb-2">Model Configuration</h2>
            <p className="text-base text-muted-foreground max-w-xl">
              Configure your assistant's core AI model and behavior settings
            </p>
          </div>

          {/* First Message Section */}
          <div>
            <label className="block text-base font-semibold tracking-[0.2px] mb-2">
              First Message (Call Greeting)
            </label>
            <p className="text-sm text-muted-foreground mb-2">
              This is the first message your assistant will say when a call starts
            </p>
            <Textarea
              placeholder="Hi! This is [Your Name] from [Your Company]. How may I help you today?"
              value={data.firstMessage}
              onChange={(e) => onChange({ firstMessage: e.target.value })}
              className="h-12 text-[15px] resize-none"
              rows={2}
            />
          </div>

          {/* System Prompt Section */}
          <div className="flex-1">
            <label className="block text-base font-semibold tracking-[0.2px] mb-2">
              System Prompt
            </label>
            <Textarea
              placeholder="You are Helen, a professional dental receptionist. You should help patients schedule appointments, answer questions about services, and provide general information about the clinic..."
              value={data.systemPrompt}
              onChange={(e) => onChange({ systemPrompt: e.target.value })}
              className="min-h-[220px] h-full text-[15px] leading-relaxed resize-y"
              rows={12}
            />
          </div>
        </div>
      </div>

      {/* Right Column - Sidebar */}
      <div className="lg:col-span-4">
        <div className="bg-background/50 rounded-lg p-5 h-full">
          <h3 className="text-lg font-semibold tracking-tight mb-4">Model Settings</h3>

          <div className="space-y-4">
            {/* Provider */}
            <div>
              <Label className="block text-sm font-medium mb-2">Provider</Label>
              <Select value={data.provider} onValueChange={(value) => onChange({ provider: value })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="OpenAI">OpenAI</SelectItem>
                  <SelectItem value="Anthropic">Anthropic</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model */}
            <div>
              <Label className="block text-sm font-medium mb-2">Model</Label>
              <Select value={data.model} onValueChange={(value) => onChange({ model: value })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="GPT-4o Mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="GPT-4o">GPT-4o</SelectItem>
                  <SelectItem value="GPT-4 Turbo">GPT-4 Turbo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Knowledge Base */}
            <div>
              <Label className="block text-sm font-medium mb-2">Knowledge Base</Label>
              <Select value={data.knowledgeBase} onValueChange={(value) => onChange({ knowledgeBase: value })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Dental FAQ">Dental FAQ</SelectItem>
                  <SelectItem value="Medical Info">Medical Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Calendar */}
            <div>
              <Label className="block text-sm font-medium mb-2">Calendar</Label>
              <Select value={data.calendar} onValueChange={(value) => onChange({ calendar: value })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Cal.com">Cal.com</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conversation Start */}
            <div>
              <Label className="block text-sm font-medium mb-2">Conversation Initiation</Label>
              <Select value={data.conversationStart} onValueChange={(value) => onChange({ conversationStart: value })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="assistant-first">Assistant Greets First</SelectItem>
                  <SelectItem value="wait-for-user">Wait for User</SelectItem>
                  <SelectItem value="custom-greeting">Custom Greeting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Temperature */}
            <div>
              <Label className="block text-sm font-medium mb-2">Temperature</Label>
              <WizardSlider
                value={data.temperature}
                onChange={(value) => onChange({ temperature: value })}
                min={0}
                max={2}
                step={0.1}
                leftLabel="Focused"
                rightLabel="Creative"
              />
            </div>

            {/* Max Tokens */}
            <div>
              <Label className="block text-sm font-medium mb-2">Max Tokens</Label>
              <Input
                type="number"
                value={data.maxTokens}
                onChange={(e) => onChange({ maxTokens: parseInt(e.target.value) || 0 })}
                className="h-10 text-center"
                placeholder="2048"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Expandable Section */}
      <div className="lg:col-span-12 mt-6">
        <Collapsible open={isTranscriberOpen} onOpenChange={setIsTranscriberOpen}>
          <CollapsibleTrigger className="w-full p-4 border rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5">
                {isTranscriberOpen ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </div>
              <h3 className="text-base font-semibold">Transcriber Configuration</h3>
            </div>
            <div className="w-4 h-4">
              {isTranscriberOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="block text-sm font-medium mb-2">Model</Label>
                <Select
                  value={data.transcriber.model}
                  onValueChange={(value) => onChange({
                    transcriber: { ...data.transcriber, model: value }
                  })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nova-2">Nova-2</SelectItem>
                    <SelectItem value="whisper-1">Whisper-1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="block text-sm font-medium mb-2">Language</Label>
                <Select
                  value={data.transcriber.language}
                  onValueChange={(value) => onChange({
                    transcriber: { ...data.transcriber, language: value }
                  })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};