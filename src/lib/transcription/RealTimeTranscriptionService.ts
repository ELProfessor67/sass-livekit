/**
 * Real-time transcription service using Web Speech API with fallback options
 */

export interface TranscriptionSegment {
  id: string;
  speaker: 'agent' | 'customer' | 'system';
  text: string;
  timestamp: number;
  confidence: number;
  isFinal: boolean;
  isPartial?: boolean;
}

export interface TranscriptionConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onTranscriptionUpdate?: (segments: TranscriptionSegment[]) => void;
  onError?: (error: Error) => void;
}

export class RealTimeTranscriptionService {
  private recognition: SpeechRecognition | null = null;
  private segments: TranscriptionSegment[] = [];
  private isListening = false;
  private config: TranscriptionConfig;
  private segmentIdCounter = 0;

  constructor(config: TranscriptionConfig = {}) {
    this.config = {
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      ...config
    };
  }

  /**
   * Initialize the speech recognition service
   */
  public initialize(): boolean {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser');
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.config.continuous || true;
    this.recognition.interimResults = this.config.interimResults || true;
    this.recognition.lang = this.config.language || 'en-US';
    this.recognition.maxAlternatives = this.config.maxAlternatives || 1;

    this.setupEventListeners();
    return true;
  }

  /**
   * Start real-time transcription
   */
  public startListening(): void {
    if (!this.recognition) {
      console.error('Speech recognition not initialized');
      return;
    }

    if (this.isListening) {
      console.warn('Already listening');
      return;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      console.log('Started real-time transcription');
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.config.onError?.(error as Error);
    }
  }

  /**
   * Stop real-time transcription
   */
  public stopListening(): void {
    if (!this.recognition || !this.isListening) {
      return;
    }

    try {
      this.recognition.stop();
      this.isListening = false;
      console.log('Stopped real-time transcription');
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  }

  /**
   * Get current transcription segments
   */
  public getSegments(): TranscriptionSegment[] {
    return [...this.segments];
  }

  /**
   * Clear all transcription segments
   */
  public clearSegments(): void {
    this.segments = [];
    this.segmentIdCounter = 0;
  }

  /**
   * Add a manual transcription segment (for testing or external input)
   */
  public addManualSegment(text: string, speaker: 'agent' | 'customer' | 'system' = 'customer'): void {
    const segment: TranscriptionSegment = {
      id: `manual_${this.segmentIdCounter++}`,
      speaker,
      text,
      timestamp: Date.now(),
      confidence: 1.0,
      isFinal: true
    };

    this.segments.push(segment);
    this.config.onTranscriptionUpdate?.(this.getSegments());
  }

  /**
   * Process audio file and return transcription
   */
  public async transcribeAudioFile(audioFile: File): Promise<TranscriptionSegment[]> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not initialized'));
        return;
      }

      const audio = new Audio();
      const url = URL.createObjectURL(audioFile);
      audio.src = url;

      const tempSegments: TranscriptionSegment[] = [];
      let isProcessing = true;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        this.recognition!.onresult = null;
        this.recognition!.onerror = null;
        this.recognition!.onend = null;
      };

      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const segment: TranscriptionSegment = {
            id: `file_${this.segmentIdCounter++}`,
            speaker: 'customer', // Default to customer for file transcription
            text: result[0].transcript,
            timestamp: Date.now(),
            confidence: result[0].confidence,
            isFinal: result.isFinal
          };

          tempSegments.push(segment);
        }

        if (isProcessing) {
          this.config.onTranscriptionUpdate?.(tempSegments);
        }
      };

      this.recognition.onerror = (event) => {
        cleanup();
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        cleanup();
        isProcessing = false;
        resolve(tempSegments);
      };

      // Start recognition when audio starts playing
      audio.onplay = () => {
        this.recognition!.start();
      };

      audio.onerror = () => {
        cleanup();
        reject(new Error('Failed to load audio file'));
      };

      audio.play().catch(reject);
    });
  }

  /**
   * Setup event listeners for speech recognition
   */
  private setupEventListeners(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      console.log('Speech recognition started');
    };

    this.recognition.onresult = (event) => {
      const newSegments: TranscriptionSegment[] = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();

        if (transcript) {
          // Determine speaker based on context or use a simple heuristic
          const speaker = this.determineSpeaker(transcript);

          const segment: TranscriptionSegment = {
            id: `live_${this.segmentIdCounter++}`,
            speaker,
            text: transcript,
            timestamp: Date.now(),
            confidence: result[0].confidence,
            isFinal: result.isFinal,
            isPartial: !result.isFinal
          };

          newSegments.push(segment);

          // Update existing partial segments or add new ones
          if (result.isFinal) {
            this.segments.push(segment);
          } else {
            // Update the last partial segment or add new one
            const lastPartialIndex = this.segments.findIndex(s => s.isPartial);
            if (lastPartialIndex !== -1) {
              this.segments[lastPartialIndex] = segment;
            } else {
              this.segments.push(segment);
            }
          }
        }
      }

      this.config.onTranscriptionUpdate?.(this.getSegments());
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      this.config.onError?.(new Error(`Speech recognition error: ${event.error}`));
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.isListening = false;
    };
  }

  /**
   * Simple heuristic to determine speaker based on transcript content
   * In a real implementation, this would be more sophisticated
   */
  private determineSpeaker(transcript: string): 'agent' | 'customer' | 'system' {
    const lowerTranscript = transcript.toLowerCase();

    // Agent phrases
    const agentPhrases = [
      'thank you for calling',
      'how can i help',
      'i can help you',
      'let me check',
      'i understand',
      'that sounds good',
      'i\'ll help you',
      'our company',
      'we offer',
      'i can schedule',
      'appointment',
      'consultation'
    ];

    // System phrases
    const systemPhrases = [
      'call connected',
      'call ended',
      'call dropped',
      'please hold',
      'transferring'
    ];

    if (systemPhrases.some(phrase => lowerTranscript.includes(phrase))) {
      return 'system';
    }

    if (agentPhrases.some(phrase => lowerTranscript.includes(phrase))) {
      return 'agent';
    }

    // Default to customer
    return 'customer';
  }

  /**
   * Check if speech recognition is supported
   */
  public static isSupported(): boolean {
    return !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  /**
   * Get available languages (if supported)
   */
  public static getAvailableLanguages(): string[] {
    // This would typically come from the browser's supported languages
    return [
      'en-US',
      'en-GB',
      'es-ES',
      'fr-FR',
      'de-DE',
      'it-IT',
      'pt-BR',
      'ja-JP',
      'ko-KR',
      'zh-CN'
    ];
  }
}

/**
 * Hook for using real-time transcription in React components
 */
export function useRealTimeTranscription(config: TranscriptionConfig = {}) {
  const [service] = React.useState(() => new RealTimeTranscriptionService(config));
  const [segments, setSegments] = React.useState<TranscriptionSegment[]>([]);
  const [isListening, setIsListening] = React.useState(false);
  const [isSupported, setIsSupported] = React.useState(false);

  React.useEffect(() => {
    const supported = RealTimeTranscriptionService.isSupported();
    setIsSupported(supported);

    if (supported) {
      service.initialize();
    }
  }, [service]);

  React.useEffect(() => {
    const handleTranscriptionUpdate = (newSegments: TranscriptionSegment[]) => {
      setSegments(newSegments);
    };

    const handleError = (error: Error) => {
      console.error('Transcription error:', error);
      setIsListening(false);
    };

    // Update service config
    service.config.onTranscriptionUpdate = handleTranscriptionUpdate;
    service.config.onError = handleError;

    return () => {
      service.stopListening();
    };
  }, [service]);

  const startListening = React.useCallback(() => {
    service.startListening();
    setIsListening(true);
  }, [service]);

  const stopListening = React.useCallback(() => {
    service.stopListening();
    setIsListening(false);
  }, [service]);

  const clearSegments = React.useCallback(() => {
    service.clearSegments();
    setSegments([]);
  }, [service]);

  const addManualSegment = React.useCallback((text: string, speaker: 'agent' | 'customer' | 'system' = 'customer') => {
    service.addManualSegment(text, speaker);
  }, [service]);

  return {
    segments,
    isListening,
    isSupported,
    startListening,
    stopListening,
    clearSegments,
    addManualSegment,
    transcribeAudioFile: service.transcribeAudioFile.bind(service)
  };
}

// Import React for the hook
import React from 'react';
