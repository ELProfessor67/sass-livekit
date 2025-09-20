import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Loader2, Plus, ExternalLink } from "lucide-react";
import { ModelData } from "./types";
import { WizardSlider } from "./WizardSlider";
import { Input } from "@/components/ui/input";
import { getKnowledgeBases, type KnowledgeBase } from "@/lib/api/knowledgeBase";

interface ModelTabProps {
  data: ModelData;
  onChange: (data: Partial<ModelData>) => void;
}

export const ModelTab: React.FC<ModelTabProps> = ({ data, onChange }) => {
  const [isTranscriberOpen, setIsTranscriberOpen] = React.useState(false);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loadingKnowledgeBases, setLoadingKnowledgeBases] = useState(false);
  const [knowledgeBaseError, setKnowledgeBaseError] = useState<string | null>(null);

  // Fetch knowledge bases on component mount
  useEffect(() => {
    const fetchKnowledgeBases = async () => {
      try {
        setLoadingKnowledgeBases(true);
        setKnowledgeBaseError(null);
        const response = await getKnowledgeBases();
        setKnowledgeBases(response.knowledgeBases || []);
      } catch (error) {
        console.error('Failed to fetch knowledge bases:', error);
        setKnowledgeBaseError(error instanceof Error ? error.message : 'Failed to load knowledge bases');
      } finally {
        setLoadingKnowledgeBases(false);
      }
    };

    fetchKnowledgeBases();
  }, []);

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
              <div className="flex items-center justify-between mb-2">
                <Label className="block text-sm font-medium">Knowledge Base</Label>
                {!loadingKnowledgeBases && (
                  <button
                    type="button"
                    onClick={() => {
                      const fetchKnowledgeBases = async () => {
                        try {
                          setLoadingKnowledgeBases(true);
                          setKnowledgeBaseError(null);
                          const response = await getKnowledgeBases();
                          setKnowledgeBases(response.knowledgeBases || []);
                        } catch (error) {
                          console.error('Failed to fetch knowledge bases:', error);
                          setKnowledgeBaseError(error instanceof Error ? error.message : 'Failed to load knowledge bases');
                        } finally {
                          setLoadingKnowledgeBases(false);
                        }
                      };
                      fetchKnowledgeBases();
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Refresh
                  </button>
                )}
              </div>
              <Select 
                value={data.knowledgeBase} 
                onValueChange={(value) => onChange({ knowledgeBase: value })}
                disabled={loadingKnowledgeBases}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={loadingKnowledgeBases ? "Loading..." : "Select knowledge base"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="None">None</SelectItem>
                  {loadingKnowledgeBases ? (
                    <SelectItem value="loading" disabled>
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading knowledge bases...</span>
                      </div>
                    </SelectItem>
                  ) : knowledgeBaseError ? (
                    <SelectItem value="error" disabled>
                      <span className="text-destructive">Error loading knowledge bases</span>
                    </SelectItem>
                  ) : knowledgeBases.length === 0 ? (
                    <SelectItem value="no-kb" disabled>
                      <span className="text-muted-foreground">No knowledge bases found</span>
                    </SelectItem>
                  ) : (
                    knowledgeBases.map((kb) => (
                      <SelectItem key={kb.id} value={kb.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{kb.name}</span>
                          {kb.description && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {kb.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {knowledgeBaseError && (
                <p className="text-xs text-destructive mt-1">{knowledgeBaseError}</p>
              )}
              {!loadingKnowledgeBases && knowledgeBases.length === 0 && !knowledgeBaseError && (
                <div className="mt-2 p-2 bg-muted/50 rounded-md">
                  <p className="text-xs text-muted-foreground mb-2">
                    No knowledge bases found. Create one to provide context to your assistant.
                  </p>
                  <a 
                    href="/knowledge-base" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create Knowledge Base
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              )}
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