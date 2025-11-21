export interface ModelData {
  provider: string;
  model: string;
  knowledgeBase: string;
  calendar: string;
  conversationStart: string;
  voice: string;
  temperature: number;
  maxTokens: number;
  firstMessage: string;
  systemPrompt: string;
  language: string;
  // Call Management Settings
  endCallMessage: string;
  maxCallDuration: number;
  idleMessages: string[];
  idleMessageMaxSpokenCount: number;
  silenceTimeoutSeconds: number;
  // Calendar credentials (populated from integration)
  calApiKey?: string;
  calEventTypeId?: string;
  calEventTypeSlug?: string;
  calTimezone?: string;
}

export interface VoiceData {
  provider: string;
  voice: string;
  model: string;
  backgroundSound: string;
  inputMinCharacters: number;
  stability: number;
  clarity: number;
  speed: number;
  style: number;
  latency: number;
  waitSeconds: number;
  smartEndpointing: string;
  advancedTimingEnabled: boolean;
  timingSlider1: number;
  timingSlider2: number;
  timingSlider3: number;
  numWordsToInterrupt: number;
  voiceSeconds: number;
  backOffSeconds: number;
  silenceTimeout: number;
  maxDuration: number;
  similarityBoost: number;
  useSpeakerBoost: boolean;
  optimizeStreaming: number;
  pronunciationDictionary: boolean;
  chunk: number;
  // Rime-specific settings
  speedAlpha?: number;
  reduceLatency?: boolean;
  // Hume-specific settings
  voiceDescription?: string;
  instantMode?: boolean;
}

export interface StructuredDataField {
  name: string;
  type: string;
  description: string;
  required?: boolean;
}

export interface AnalysisData {
  structuredData: StructuredDataField[];
  callSummary: string;
  successEvaluation: boolean;
  customSuccessPrompt: string;
  // Analysis timeout settings
  summaryTimeout: number;
  evaluationTimeout: number;
  structuredDataTimeout: number;
  // Structured data configuration
  structuredDataPrompt: string;
  structuredDataProperties: any;
}

export interface AdvancedData {
  hipaaCompliant: boolean;
  pciCompliant: boolean;
  recordingEnabled: boolean;
  audioRecordingFormat: string;
  videoRecordingEnabled: boolean;
  endCallPhrases: string[];
  responseDelaySeconds: number;
  llmRequestDelaySeconds: number;
  numWordsToInterruptAssistant: number;
  maxDurationSeconds: number;
  backgroundSound: string;
  voicemailDetectionEnabled: boolean;
  voicemailMessage?: string;
  transferEnabled: boolean;
  transferPhoneNumber: string;
  transferCountryCode: string;
  transferSentence: string;
  transferCondition: string;
}

export interface SMSData {
  provider: string;
  knowledgeBase: string;
  calendar: string;
  calendarBookingEnabled: boolean;
  systemPrompt: string;
  firstMessage: string;
  responseStyle: number;
  characterLimit: number;
  language: string;
  autoReply: boolean;
  autoReplyDelay: number;
  businessHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  messageTemplates: string[];
  complianceSettings: {
    tcpaCompliant: boolean;
    optInEnabled: boolean;
    optOutKeywords: string[];
    helpKeywords: string[];
  };
  escalationRules: {
    enabled: boolean;
    humanTransferKeywords: string[];
    maxAutoResponses: number;
  };
}

export interface N8nWebhookField {
  name: string;
  description: string;
}

export interface N8nData {
  webhookUrl: string;
  webhookFields: N8nWebhookField[];
}

export interface AssistantFormData {
  name: string;
  id: string;
  model: ModelData;
  voice: VoiceData;
  sms: SMSData;
  analysis: AnalysisData;
  advanced: AdvancedData;
  n8n: N8nData;
}