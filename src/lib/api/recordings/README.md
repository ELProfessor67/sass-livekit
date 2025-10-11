# Recording API Usage Guide

This guide explains how to use the enhanced recording functionality for SIP trunk calls with Twilio.

## Overview

The recording system now supports:
- **Multiple formats**: WAV (128kbps) and MP3 (32kbps)
- **Dual-channel support**: Separate channels for each call leg
- **Metadata-only requests**: Get recording info without downloading audio
- **Automatic fallback**: Falls back to mono if dual-channel isn't available
- **Caching**: Avoid repeated API calls for the same recording

## Basic Usage

### Fetch Recording with Audio URL

```typescript
import { fetchRecordingUrl } from '@/lib/api/recordings/fetchRecordingUrl';

// Basic usage - defaults to WAV format, dual-channel
const recording = await fetchRecordingUrl('CA1234567890abcdef1234567890abcdef');

if (recording) {
  console.log('Recording SID:', recording.recordingSid);
  console.log('Audio URL:', recording.recordingUrl);
  console.log('Duration:', recording.recordingDuration);
  console.log('Channels:', recording.recordingChannels);
}
```

### Fetch Recording with Custom Format

```typescript
// MP3 format, mono-channel
const mp3Recording = await fetchRecordingUrl('CA1234567890abcdef1234567890abcdef', {
  format: 'mp3',
  channels: 1
});

// WAV format, dual-channel (default)
const wavRecording = await fetchRecordingUrl('CA1234567890abcdef1234567890abcdef', {
  format: 'wav',
  channels: 2
});
```

### Fetch Recording Metadata Only

```typescript
import { fetchRecordingMetadata } from '@/lib/api/recordings/fetchRecordingUrl';

// Get recording info without audio URL
const metadata = await fetchRecordingMetadata('CA1234567890abcdef1234567890abcdef');

if (metadata) {
  console.log('Recording Status:', metadata.recordingStatus);
  console.log('Duration:', metadata.recordingDuration);
  console.log('Source:', metadata.recordingSource);
  console.log('Media URL:', metadata.mediaUrl);
  // Note: recordingUrl will be empty for metadata-only requests
}
```

### Cached Recording Fetch

```typescript
import { fetchRecordingUrlCached } from '@/lib/api/recordings/fetchRecordingUrl';

// Uses caching to avoid repeated API calls
const recording = await fetchRecordingUrlCached('CA1234567890abcdef1234567890abcdef', {
  format: 'mp3',
  channels: 2
});
```

## API Endpoints

### Server Endpoints

#### Get Recording Information
```
GET /api/v1/call/{callSid}/recordings
```

**Query Parameters:**
- `accountSid` (required): Twilio Account SID
- `authToken` (required): Twilio Auth Token
- `format` (optional): 'wav' or 'mp3' (default: 'wav')
- `channels` (optional): 1 or 2 (default: 2)
- `includeMetadata` (optional): true/false (default: true)
- `metadataOnly` (optional): true/false (default: false)

**Example:**
```bash
curl "http://localhost:4000/api/v1/call/CA1234567890abcdef1234567890abcdef/recordings?accountSid=ACxxx&authToken=xxx&format=mp3&channels=2"
```

#### Get Recording Audio
```
GET /api/v1/calls/recording/{recordingSid}/audio
```

**Query Parameters:**
- `accountSid` (required): Twilio Account SID
- `authToken` (required): Twilio Auth Token
- `format` (optional): 'wav' or 'mp3' (default: 'wav')
- `channels` (optional): 1 or 2 (default: 2)

**Example:**
```bash
curl "http://localhost:4000/api/v1/calls/recording/RE1234567890abcdef1234567890abcdef/audio?accountSid=ACxxx&authToken=xxx&format=wav&channels=2" \
  --output recording.wav
```

## Response Format

### RecordingInfo Interface

```typescript
interface RecordingInfo {
  recordingSid: string;           // Twilio Recording SID
  recordingUrl: string;           // Proxy URL for audio download
  recordingStatus: string;       // 'completed', 'processing', etc.
  recordingDuration: number;      // Duration in seconds
  recordingChannels: number;      // Number of audio channels
  recordingStartTime: string;     // ISO timestamp
  recordingSource: string;        // Recording source
  recordingTrack: string;         // 'both', 'inbound', 'outbound'
  recordingFormat?: 'wav' | 'mp3'; // Audio format
  recordingBitrate?: number;      // Bitrate in kbps
  mediaUrl?: string;              // Direct Twilio media URL
  encryptionDetails?: {           // Encryption info (if applicable)
    encryptionPublicKeySid: string;
    encryptionCek: string;
    encryptionIv: string;
  };
}
```

## Error Handling

The system includes automatic fallback mechanisms:

1. **Dual-channel fallback**: If dual-channel recording isn't available, automatically falls back to mono-channel
2. **Format validation**: Ensures only supported formats (WAV/MP3) are requested
3. **Channel validation**: Ensures only valid channel counts (1/2) are requested

### Example Error Handling

```typescript
try {
  const recording = await fetchRecordingUrl(callSid, {
    format: 'wav',
    channels: 2
  });
  
  if (!recording) {
    console.log('No recording found for this call');
    return;
  }
  
  // Use the recording...
} catch (error) {
  console.error('Failed to fetch recording:', error);
  // Handle error appropriately
}
```

## Best Practices

1. **Use caching**: Use `fetchRecordingUrlCached` for repeated requests
2. **Choose appropriate format**: 
   - WAV for high quality (128kbps, larger file size)
   - MP3 for smaller file size (32kbps, compressed)
3. **Handle dual-channel carefully**: Not all recordings support dual-channel
4. **Check recording status**: Ensure recording is 'completed' before downloading
5. **Use metadata-only requests**: When you only need recording information without audio

## Integration with Call History

The recording system integrates with your call history database:

```typescript
// Example: Fetch recording for a call from call history
const callHistory = await supabase
  .from('call_history')
  .select('call_sid, recording_sid, recording_status')
  .eq('id', callId)
  .single();

if (callHistory.data?.call_sid) {
  const recording = await fetchRecordingUrl(callHistory.data.call_sid);
  // Use recording...
}
```

## Troubleshooting

### Common Issues

1. **No recordings found**: Ensure the call was actually recorded
2. **Dual-channel not available**: Older recordings or certain recording sources don't support dual-channel
3. **Authentication errors**: Verify Twilio credentials are correct
4. **Format not supported**: Ensure you're requesting WAV or MP3 format

### Debug Information

The system logs detailed information for debugging:

```typescript
// Enable debug logging
console.log('Fetching recording for call:', callSid);
console.log('Using format:', format);
console.log('Using channels:', channels);
```

## Migration from Old System

If you're migrating from the old recording system:

1. **Update function calls**: Add format and channels parameters
2. **Handle new response fields**: Use the enhanced RecordingInfo interface
3. **Update error handling**: Handle new fallback mechanisms
4. **Test thoroughly**: Verify recordings work with your specific Twilio setup
