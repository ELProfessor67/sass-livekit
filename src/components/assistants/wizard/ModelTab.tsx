import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, ChevronRight, Loader2, X, Search, Phone, Calendar, CheckCircle2 } from "lucide-react";
import { ModelData } from "./types";
import { WizardSlider } from "./WizardSlider";
import { Input } from "@/components/ui/input";
import { getKnowledgeBases, type KnowledgeBase } from "@/lib/api/knowledgeBase";
import { CalendarCredentialsService, type UserCalendarCredentials } from "@/lib/calendar-credentials";
import { CalendarEventTypeService, type CalendarEventType, type CalComEventType, fetchEventTypesFromCalCom } from "@/lib/calendar-event-types";
// EventTypeSelector removed - using simple event slug input instead
import { useToast } from "@/hooks/use-toast";

// Predefined idle message options
const IDLE_MESSAGE_OPTIONS = [
  "Are you still there?",
  "I'm still here if you need anything",
  "Did you have any other questions?",
  "Let me know if you need help with anything else",
  "Are we still connected?",
  "I'm listening whenever you're ready",
  "Take your time, I'll wait",
  "Is everything okay?",
  "Would you like me to repeat anything?",
  "I'm here when you're ready to continue",
  "Please let me know if you need assistance",
  "I'm waiting for your response"
];

interface ModelTabProps {
  data: ModelData;
  onChange: (data: Partial<ModelData>) => void;
}

export const ModelTab: React.FC<ModelTabProps> = ({ data, onChange }) => {
  const [isCallManagementOpen, setIsCallManagementOpen] = React.useState(false);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loadingKnowledgeBases, setLoadingKnowledgeBases] = useState(false);
  const [knowledgeBaseError, setKnowledgeBaseError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [calendarCredentials, setCalendarCredentials] = useState<UserCalendarCredentials[]>([]);
  const [loadingCalendarCredentials, setLoadingCalendarCredentials] = useState(false);
  const [eventTypes, setEventTypes] = useState<CalComEventType[]>([]);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);
  const [eventTypesError, setEventTypesError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Check if assistant has calendar API key
  const hasCalendarApiKey = () => {
    return !!data.calApiKey;
  };

  // Idle message helper functions
  const removeIdleMessage = (index: number) => {
    const updated = data.idleMessages.filter((_, i) => i !== index);
    onChange({ idleMessages: updated });
  };

  const toggleIdleMessage = (message: string) => {
    const updated = data.idleMessages.includes(message)
      ? data.idleMessages.filter(msg => msg !== message)
      : [...data.idleMessages, message];
    onChange({ idleMessages: updated });
  };

  const selectAllIdleMessages = () => {
    const filteredOptions = IDLE_MESSAGE_OPTIONS.filter(option =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
    onChange({ idleMessages: [...filteredOptions] });
  };

  const clearAllIdleMessages = () => {
    onChange({ idleMessages: [] });
  };

  // Filter idle message options based on search term
  const filteredIdleOptions = IDLE_MESSAGE_OPTIONS.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCalendarChange = async (calendarIntegrationId: string) => {
    console.log("Calendar change triggered:", calendarIntegrationId);
    console.log("Available calendar credentials:", calendarCredentials);

    if (calendarIntegrationId === "None") {
      // Clear calendar credentials and event types
      onChange({
        calendar: "None",
        calApiKey: "",
        calEventTypeId: "",
        calEventTypeSlug: "",
        calTimezone: "UTC"
      });
      setEventTypes([]);
      setEventTypesError(null);
      return;
    }

    // Find the selected calendar integration
    const selectedIntegration = calendarCredentials.find(cred => cred.id === calendarIntegrationId);
    console.log("Selected integration:", selectedIntegration);

    if (selectedIntegration) {
      // Populate calendar credentials from the integration
      const updateData = {
        calendar: calendarIntegrationId,
        calApiKey: selectedIntegration.api_key,
        calTimezone: selectedIntegration.timezone || "UTC",
        // Clear event type fields - they will be set when user selects an event type
        calEventTypeId: "",
        calEventTypeSlug: ""
      };
      console.log("Updating calendar data:", updateData);
      onChange(updateData);

      // Fetch event types for the selected calendar
      await fetchEventTypesForCalendar(calendarIntegrationId);
    }
  };

  const fetchEventTypesForCalendar = async (calendarCredentialId: string) => {
    try {
      setLoadingEventTypes(true);
      setEventTypesError(null);
      const eventTypes = await fetchEventTypesFromCalCom(calendarCredentialId);
      setEventTypes(eventTypes);
      console.log("Fetched event types:", eventTypes);
    } catch (error) {
      console.error('Failed to fetch event types:', error);
      setEventTypesError(error instanceof Error ? error.message : 'Failed to load event types');
      setEventTypes([]);
    } finally {
      setLoadingEventTypes(false);
    }
  };


  const handleEventTypeChange = (eventType: CalComEventType | null) => {
    if (eventType) {
      // Update calendar credentials with selected event type
      onChange({
        calEventTypeId: eventType.id.toString(),
        calEventTypeSlug: eventType.slug
      });
    } else {
      // Clear event type fields
      onChange({
        calEventTypeId: "",
        calEventTypeSlug: ""
      });
    }
  };


  // Fetch knowledge bases and calendar credentials on component mount
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

    const fetchCalendarCredentials = async () => {
      try {
        setLoadingCalendarCredentials(true);
        const credentials = await CalendarCredentialsService.getAllCredentials();
        console.log("Loaded calendar credentials:", credentials);
        setCalendarCredentials(credentials);
      } catch (error) {
        console.error('Failed to fetch calendar credentials:', error);
        toast({
          title: "Error",
          description: "Failed to load calendar integrations.",
          variant: "destructive",
        });
      } finally {
        setLoadingCalendarCredentials(false);
      }
    };


    fetchKnowledgeBases();
    fetchCalendarCredentials();

    // Fetch event types if calendar is already selected
    if (data.calendar && data.calendar !== "None") {
      fetchEventTypesForCalendar(data.calendar);
    }
  }, [toast, data.calendar]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[540px]">
      {/* Left Column - Main Content */}
      <div className="lg:col-span-8 flex flex-col h-full">
        {/* Header Section */}
        <div className="mb-6">
          <h2 className="text-[28px] font-light tracking-[0.2px] mb-2">Model Configuration</h2>
          <p className="text-base text-muted-foreground max-w-xl">
            Configure your assistant's core AI model and behavior settings
          </p>
        </div>

        {/* First Message Section */}
        <div className="mb-6">
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
        <div className="flex-1 flex flex-col">
          <label className="block text-base font-semibold tracking-[0.2px] mb-2">
            System Prompt
          </label>
          <Textarea
            placeholder="You are Helen, a professional dental receptionist. You should help patients schedule appointments, answer questions about services, and provide general information about the clinic..."
            value={data.systemPrompt}
            onChange={(e) => onChange({ systemPrompt: e.target.value })}
            className="flex-1 min-h-[220px] text-[15px] leading-relaxed resize-y"
            rows={12}
          />
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
              <Select value={data.provider} onValueChange={(value) => {
                // Reset model when provider changes
                const defaultModels = {
                  "OpenAI": "GPT-4.1 Mini",
                  "Anthropic": "Claude 3.5 Sonnet",
                  "Google": "Gemini 1.5 Pro",
                  "Groq": "llama-3.1-8b-instant",
                  "Cerebras": "gpt-oss-120b"
                };
                const newModel = defaultModels[value as keyof typeof defaultModels] || "";
                console.log('Provider changed:', { from: data.provider, to: value, newModel });
                onChange({ provider: value, model: newModel });
              }}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="OpenAI">OpenAI</SelectItem>
                  <SelectItem value="Anthropic">Anthropic</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="Groq">Groq</SelectItem>
                  <SelectItem value="Cerebras">Cerebras</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model */}
            <div>
              <Label className="block text-sm font-medium mb-2">Model</Label>
              <Select value={data.model} onValueChange={(value) => {
                console.log('Model changed:', { from: data.model, to: value, provider: data.provider });
                onChange({ model: value });
              }}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {data.provider === "OpenAI" && (
                    <>
                      <SelectItem value="GPT-4.1 Mini">GPT-4.1 Mini</SelectItem>
                      <SelectItem value="GPT-4.1">GPT-4.1</SelectItem>
                      <SelectItem value="GPT-4o Mini">GPT-4o Mini</SelectItem>
                      <SelectItem value="GPT-4o">GPT-4o</SelectItem>
                    </>
                  )}
                  {data.provider === "Anthropic" && (
                    <>
                      <SelectItem value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</SelectItem>
                    </>
                  )}
                  {data.provider === "Google" && (
                    <>
                      <SelectItem value="Gemini 1.5 Pro">Gemini 1.5 Pro</SelectItem>
                      <SelectItem value="Gemini 1.5 Flash">Gemini 1.5 Flash</SelectItem>
                    </>
                  )}
                  {data.provider === "Groq" && (
                    <>
                      <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B Instant</SelectItem>
                      <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile</SelectItem>
                      <SelectItem value="meta-llama/llama-4-maverick-17b-128e-instruct">Llama 4 Maverick 17B</SelectItem>
                    </>
                  )}
                  {data.provider === "Cerebras" && (
                    <>
                      <SelectItem value="llama-3.3-70b">Llama 3.3 70B</SelectItem>
                      <SelectItem value="gpt-oss-120b">GPT OSS 120B</SelectItem>
                      <SelectItem value="llama-3.1-70b">Llama 3.1 70B</SelectItem>
                    </>
                  )}
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
                <p className="text-xs text-muted-foreground mt-2">
                  No knowledge bases found. Create one{" "}
                  <a
                    href="/knowledge-base"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 underline"
                  >
                    here
                  </a>
                </p>
              )}
            </div>

            {/* Calendar */}
            <div>
              <Label className="block text-sm font-medium mb-2">Calendar Integration</Label>
              <Select value={data.calendar || "None"} onValueChange={(value) => handleCalendarChange(value)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select calendar" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="None">None</SelectItem>
                  {calendarCredentials.map((cred) => (
                    <SelectItem key={cred.id} value={cred.id}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{cred.label}</span>
                        {cred.is_active && (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {loadingCalendarCredentials && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading calendar integrations...
                </div>
              )}
              {!loadingCalendarCredentials && calendarCredentials.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Calendar not connected. Configure{" "}
                  <a
                    href="/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 underline"
                  >
                    here
                  </a>
                </p>
              )}
            </div>

            {/* Event Type Selection */}
            {data.calendar && data.calendar !== "None" && (
              <div>
                <Label className="block text-sm font-medium mb-2">Event Type</Label>
                <Select
                  value={data.calEventTypeId || "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      handleEventTypeChange(null);
                    } else {
                      const selectedEventType = eventTypes.find(et => et.id.toString() === value);
                      handleEventTypeChange(selectedEventType || null);
                    }
                  }}
                  onOpenChange={(open) => {
                    if (open && data.calendar && data.calendar !== "None") {
                      fetchEventTypesForCalendar(data.calendar);
                    }
                  }}
                  disabled={loadingEventTypes}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={loadingEventTypes ? "Loading event types..." : "Select an event type"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="none">None</SelectItem>
                    {loadingEventTypes ? (
                      <SelectItem value="loading-event-types" disabled>
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading event types...</span>
                        </div>
                      </SelectItem>
                    ) : eventTypesError ? (
                      <SelectItem value="event-types-error" disabled>
                        <span className="text-destructive">Error loading event types</span>
                      </SelectItem>
                    ) : eventTypes.length === 0 ? (
                      <SelectItem value="no-event-types" disabled>
                        <span className="text-muted-foreground">No event types found</span>
                      </SelectItem>
                    ) : (
                      eventTypes.map((eventType) => (
                        <SelectItem key={eventType.id} value={eventType.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{eventType.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {eventType.slug} • {eventType.length} min
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {eventTypesError && (
                  <p className="text-xs text-destructive mt-1">{eventTypesError}</p>
                )}
              </div>
            )}


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

            {/* Language */}
            <div>
              <Label className="block text-sm font-medium mb-2">Language</Label>
              <Select value={data.language} onValueChange={(value) => onChange({ language: value })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="en-es">English & Spanish</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="nl">Dutch</SelectItem>
                  <SelectItem value="no">Norwegian</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timezone Format */}
            <div>
              <Label className="block text-sm font-medium mb-2">Timezone Format</Label>
              <Select
                value={data.timezoneFormat || "US-based"}
                onValueChange={(value: "US-based" | "International") => onChange({ timezoneFormat: value })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="US-based">US-based (Tuesday, Feb 17, 2026 at 1pm)</SelectItem>
                  <SelectItem value="International">International (Tuesday 17 Feb 2026 at 13:00)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>


      {/* Call Management Settings */}
      <div className="lg:col-span-12 mt-[var(--space-xl)]">
        <Card variant="default" className="overflow-hidden">
          <Collapsible open={isCallManagementOpen} onOpenChange={setIsCallManagementOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-[var(--space-lg)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-[var(--space-md)]">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base font-medium">Call Management</CardTitle>
                      <CardDescription className="text-sm">
                        Configure call handling, idle messages, and timeout settings
                      </CardDescription>
                    </div>
                  </div>
                  {isCallManagementOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="pt-0 pb-[var(--space-lg)] px-[var(--space-lg)]">
                <div className="space-y-[var(--space-xl)]">
                  {/* End Call Message */}
                  <div className="space-y-[var(--space-sm)]">
                    <Label className="text-sm font-medium">End Call Message</Label>
                    <p className="text-xs text-muted-foreground">
                      This message will be spoken by the assistant when the call is ended.
                    </p>
                    <Input
                      placeholder="Thank you for calling. Have a great day!"
                      value={data.endCallMessage}
                      onChange={(e) => onChange({ endCallMessage: e.target.value })}
                      className="w-full"
                    />
                  </div>

                  {/* Idle Messages */}
                  <div className="space-y-[var(--space-sm)]">
                    <Label className="text-sm font-medium">Idle Messages</Label>
                    <p className="text-xs text-muted-foreground">
                      Select predefined messages that the assistant will use when the user hasn't responded
                    </p>

                    {/* Message Pills */}
                    {data.idleMessages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {data.idleMessages.map((message, index) => (
                          <div
                            key={index}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm"
                          >
                            <span className="text-foreground">{message}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeIdleMessage(index)}
                              className="h-4 w-4 p-0 hover:bg-destructive/20 rounded-full"
                            >
                              <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dropdown Selector */}
                    <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isDropdownOpen}
                          className="w-full justify-between text-left font-normal"
                        >
                          {data.idleMessages.length > 0
                            ? `${data.idleMessages.length} message${data.idleMessages.length > 1 ? 's' : ''} selected`
                            : "Select idle messages..."
                          }
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <div className="max-h-80 overflow-hidden rounded-md">
                          {/* Search */}
                          <div className="flex items-center border-b border-border px-3 py-3 bg-popover">
                            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                            <Input
                              placeholder="Search messages..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent h-6 px-0 text-sm placeholder:text-muted-foreground"
                            />
                          </div>

                          {/* Select All / Clear All */}
                          <div className="flex justify-between items-center p-3 bg-muted/30 border-b border-border">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={selectAllIdleMessages}
                              className="h-7 px-2 text-xs"
                            >
                              Select All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearAllIdleMessages}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                            >
                              Clear All
                            </Button>
                          </div>

                          {/* Options List */}
                          <div className="max-h-48 overflow-auto">
                            {filteredIdleOptions.length > 0 ? (
                              filteredIdleOptions.map((option) => (
                                <div
                                  key={option}
                                  className="flex items-center space-x-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                                  onClick={() => toggleIdleMessage(option)}
                                >
                                  <Checkbox
                                    checked={data.idleMessages.includes(option)}
                                    onChange={() => { }}
                                    className="pointer-events-none"
                                  />
                                  <span className="flex-1 text-sm text-foreground">{option}</span>
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                No messages found
                              </div>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-2 gap-[var(--space-lg)]">
                    {/* Max Idle Messages */}
                    <div className="space-y-[var(--space-sm)]">
                      <Label className="text-sm font-medium">Max Idle Messages</Label>
                      <p className="text-xs text-muted-foreground">
                        Maximum number of idle messages before ending call
                      </p>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={data.idleMessageMaxSpokenCount}
                        onChange={(e) => onChange({ idleMessageMaxSpokenCount: parseInt(e.target.value) || 3 })}
                        className="text-center"
                        placeholder="3"
                      />
                    </div>

                    {/* Idle Timeout */}
                    <div className="space-y-[var(--space-sm)]">
                      <Label className="text-sm font-medium">Idle Timeout (seconds)</Label>
                      <p className="text-xs text-muted-foreground">
                        Time to wait before sending idle message
                      </p>
                      <Input
                        type="number"
                        min="5"
                        max="60"
                        value={data.silenceTimeoutSeconds}
                        onChange={(e) => onChange({ silenceTimeoutSeconds: parseInt(e.target.value) || 10 })}
                        className="text-center"
                        placeholder="10"
                      />
                    </div>
                  </div>

                  {/* Maximum Call Duration */}
                  <div className="space-y-[var(--space-sm)]">
                    <Label className="text-sm font-medium">Maximum Call Duration (minutes)</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically end calls after this duration to prevent excessive charges
                    </p>
                    <Input
                      type="number"
                      min="1"
                      max="120"
                      value={data.maxCallDuration}
                      onChange={(e) => onChange({ maxCallDuration: parseInt(e.target.value) || 30 })}
                      className="w-32 text-center"
                      placeholder="30"
                    />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </div>
  );
};