# Real-Time Transcription System

This directory contains the real-time transcription system for the conversations feature.

## Features

- **Real-time speech-to-text** using Web Speech API
- **Live transcription display** with speaker identification
- **Audio level monitoring** with visual feedback
- **Manual transcription input** for testing and corrections
- **Demo mode** with sample conversations
- **Browser compatibility** detection and fallbacks

## Components

### `RealTimeTranscriptionService.ts`
Core service that handles:
- Web Speech API integration
- Real-time audio processing
- Speaker identification
- Confidence scoring
- Event handling and callbacks

### `RealTimeTranscription.tsx`
React component that provides:
- Recording controls (start/stop)
- Live transcription display
- Audio level visualization
- Manual input interface
- Speaker selection

### `TranscriptionDemo.tsx`
Demo component that shows:
- Sample conversation transcription
- Live vs demo mode switching
- Interactive controls
- Browser compatibility status

## Usage

### Basic Usage
```tsx
import { useRealTimeTranscription } from '@/lib/transcription/RealTimeTranscriptionService';

function MyComponent() {
  const {
    segments,
    isListening,
    isSupported,
    startListening,
    stopListening
  } = useRealTimeTranscription({
    onTranscriptionUpdate: (segments) => {
      console.log('New transcription:', segments);
    }
  });

  return (
    <div>
      <button onClick={startListening}>Start Recording</button>
      <button onClick={stopListening}>Stop Recording</button>
      {segments.map(segment => (
        <div key={segment.id}>
          {segment.speaker}: {segment.text}
        </div>
      ))}
    </div>
  );
}
```

### In Conversations
The transcription system is integrated into the conversations feature:

1. **MessageThread** - Shows live transcription alongside call history
2. **MessageBubble** - Displays transcription segments as message bubbles
3. **Conversations Page** - Includes demo and live transcription controls

## Browser Support

- ✅ Chrome (recommended)
- ✅ Edge
- ✅ Safari
- ❌ Firefox (limited support)

## Configuration

The service can be configured with:

```tsx
const config = {
  language: 'en-US',           // Speech recognition language
  continuous: true,            // Continue listening after each result
  interimResults: true,        // Show partial results
  maxAlternatives: 1,          // Number of alternative results
  onTranscriptionUpdate: fn,   // Callback for updates
  onError: fn                  // Error handler
};
```

## API Reference

### RealTimeTranscriptionService

#### Methods
- `initialize()` - Initialize the service
- `startListening()` - Start real-time transcription
- `stopListening()` - Stop transcription
- `clearSegments()` - Clear all segments
- `addManualSegment(text, speaker)` - Add manual segment
- `transcribeAudioFile(file)` - Transcribe audio file

#### Properties
- `segments` - Array of transcription segments
- `isListening` - Whether currently listening
- `isSupported` - Browser support status

### TranscriptionSegment Interface
```tsx
interface TranscriptionSegment {
  id: string;
  speaker: 'agent' | 'customer' | 'system';
  text: string;
  timestamp: number;
  confidence: number;
  isFinal: boolean;
  isPartial?: boolean;
}
```

## Integration with Conversations

The transcription system integrates seamlessly with the existing conversations feature:

1. **Live transcription** appears as message bubbles in the conversation thread
2. **Speaker identification** automatically determines agent vs customer
3. **Real-time updates** show partial results with visual indicators
4. **Audio recordings** can be transcribed using the file transcription feature

## Future Enhancements

- [ ] WebRTC integration for remote audio
- [ ] Custom vocabulary support
- [ ] Multiple language detection
- [ ] Cloud transcription service fallback
- [ ] Export transcription data
- [ ] Advanced speaker diarization
