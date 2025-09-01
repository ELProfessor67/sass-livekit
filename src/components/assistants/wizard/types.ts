export interface ModelData {
  provider: string;
  model: string;
  knowledgeBase: string;
  calendar: string;
  conversationStart: string;
  temperature: number;
  maxTokens: number;
  firstMessage: string;
  systemPrompt: string;
  transcriber: {
    model: string;
    language: string;
  };
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
}

export interface StructuredDataField {
  name: string;
  type: string;
  description: string;
}

export interface AnalysisData {
  structuredData: StructuredDataField[];
  callSummary: boolean;
  successEvaluation: boolean;
  customSuccessPrompt: string;
}

export interface AdvancedData {
  hipaaCompliant: boolean;
  recordingEnabled: boolean;
  videoRecordingEnabled: boolean;
  endCallMessage: string;
  endCallPhrases: string[];
  maxCallDuration: number;
  idleMessages: string[];
  idleMessageMaxSpokenCount: number;
  silenceTimeoutSeconds: number;
  responseDelaySeconds: number;
  llmRequestDelaySeconds: number;
  numWordsToInterruptAssistant: number;
  maxDurationSeconds: number;
  backgroundSound: string;
  // Optional Cal.com integration (stored locally for now)
  calApiKey?: string;
  calEventTypeId?: string;
  calEventTypeSlug?: string;
  calTimezone?: string;
}

export interface AssistantFormData {
  name: string;
  id: string;
  model: ModelData;
  voice: VoiceData;
  analysis: AnalysisData;
  advanced: AdvancedData;
}