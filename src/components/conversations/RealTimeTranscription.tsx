import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Square, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealTimeTranscription, TranscriptionSegment } from '@/lib/transcription/RealTimeTranscriptionService';

interface RealTimeTranscriptionProps {
  conversationId: string;
  onTranscriptionUpdate?: (segments: TranscriptionSegment[]) => void;
  className?: string;
}

export function RealTimeTranscription({ 
  conversationId, 
  onTranscriptionUpdate,
  className 
}: RealTimeTranscriptionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedSpeaker, setSelectedSpeaker] = useState<'agent' | 'customer' | 'system'>('customer');
  const [manualText, setManualText] = useState('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const {
    segments,
    isListening,
    isSupported,
    startListening,
    stopListening,
    clearSegments,
    addManualSegment
  } = useRealTimeTranscription({
    onTranscriptionUpdate: (newSegments) => {
      onTranscriptionUpdate?.(newSegments);
    }
  });

  // Audio level monitoring
  useEffect(() => {
    if (isRecording && isListening) {
      startAudioLevelMonitoring();
    } else {
      stopAudioLevelMonitoring();
    }

    return () => {
      stopAudioLevelMonitoring();
    };
  }, [isRecording, isListening]);

  const startAudioLevelMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Failed to start audio monitoring:', error);
    }
  };

  const stopAudioLevelMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setAudioLevel(0);
  };

  const handleStartRecording = () => {
    if (!isSupported) {
      alert('Speech recognition is not supported in this browser');
      return;
    }
    
    startListening();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    stopListening();
    setIsRecording(false);
  };

  const handleAddManualSegment = () => {
    if (manualText.trim()) {
      addManualSegment(manualText.trim(), selectedSpeaker);
      setManualText('');
    }
  };

  const handleClearTranscription = () => {
    clearSegments();
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'agent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'customer':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'system':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (!isSupported) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground", className)}>
        <VolumeX className="w-8 h-8 mx-auto mb-2" />
        <p>Speech recognition is not supported in this browser.</p>
        <p className="text-sm">Please use Chrome, Edge, or Safari for real-time transcription.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center space-x-2">
          <Button
            variant={isRecording ? "destructive" : "default"}
            size="sm"
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={!isSupported}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Start Recording
              </>
            )}
          </Button>

          {isRecording && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">Recording...</span>
              <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-100"
                  style={{ width: `${audioLevel * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearTranscription}
            disabled={segments.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Manual Input */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <select
            value={selectedSpeaker}
            onChange={(e) => setSelectedSpeaker(e.target.value as 'agent' | 'customer' | 'system')}
            className="px-3 py-1 text-sm border rounded-md bg-background"
          >
            <option value="customer">Customer</option>
            <option value="agent">Agent</option>
            <option value="system">System</option>
          </select>
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Add manual transcription..."
            className="flex-1 px-3 py-1 text-sm border rounded-md bg-background"
            onKeyPress={(e) => e.key === 'Enter' && handleAddManualSegment()}
          />
          <Button
            size="sm"
            onClick={handleAddManualSegment}
            disabled={!manualText.trim()}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Transcription Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Live Transcription</h3>
          <Badge variant="outline" className="text-xs">
            {segments.length} segments
          </Badge>
        </div>

        <ScrollArea className="h-64 w-full border rounded-lg">
          <div className="p-4 space-y-3">
            {segments.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Mic className="w-8 h-8 mx-auto mb-2" />
                <p>No transcription yet</p>
                <p className="text-sm">Start recording to see live transcription</p>
              </div>
            ) : (
              segments.map((segment) => (
                <div
                  key={segment.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all duration-200",
                    segment.isPartial && "opacity-70 bg-muted/50",
                    segment.isFinal && "bg-background"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getSpeakerColor(segment.speaker))}
                    >
                      {segment.speaker}
                    </Badge>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{formatTimestamp(segment.timestamp)}</span>
                      {segment.isPartial && (
                        <Badge variant="secondary" className="text-xs">
                          Live
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm leading-relaxed">
                    {segment.text}
                    {segment.isPartial && (
                      <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                    )}
                  </p>
                  
                  {segment.confidence < 0.8 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Confidence: {Math.round(segment.confidence * 100)}%
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
