# TTS Fallback Configuration Guide

## Overview
The system now has robust TTS fallback functionality that automatically switches from ElevenLabs to OpenAI when ElevenLabs fails or times out.

## Configuration Options

### 1. Automatic Fallback (Default)
The system will automatically use ElevenLabs as primary TTS and fall back to OpenAI when ElevenLabs fails.

**Environment Variables:**
```bash
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional (for ElevenLabs)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### 2. OpenAI Only Mode
If ElevenLabs is causing persistent issues, disable it completely:

```bash
DISABLE_ELEVENLABS=true
OPENAI_API_KEY=your_openai_api_key
```

### 3. ElevenLabs Only Mode
If you want to use only ElevenLabs (not recommended due to timeout issues):

```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key
# Don't set OPENAI_API_KEY
```

## How It Works

### Fallback Logic
1. **Primary**: ElevenLabs TTS (if available and not disabled)
2. **Fallback**: OpenAI TTS (always available as backup)
3. **Behavior**: `max_retry_per_tts=0` means immediate fallback on failure

### Voice Mapping
ElevenLabs voices are automatically mapped to similar OpenAI voices:
- `rachel` → `nova`
- `domi` → `shimmer`
- `antoni` → `echo`
- `bella` → `nova`
- `elli` → `nova`
- `josh` → `echo`
- `arnold` → `fable`
- Default: `alloy`

## Testing

### Test the Fallback System
The TTS fallback system is automatically tested during agent initialization. Monitor the logs for fallback activity and configuration messages.

### Expected Output
```
🧪 Testing TTS Fallback System
📞 Testing OpenAI TTS...
✅ OpenAI TTS configured successfully
📞 Testing ElevenLabs TTS...
✅ ElevenLabs TTS configured successfully
🔄 FallbackAdapter configured with 2 TTS instances
✅ TTS fallback system is properly configured
```

## Troubleshooting

### Common Issues

1. **ElevenLabs Timeout Errors**
   - **Symptom**: `11labs tts timed out after 10.0 seconds`
   - **Solution**: The system will automatically fall back to OpenAI

2. **TTS Constructor Errors**
   - **Symptom**: `TTS.__init__() got an unexpected keyword argument 'timeout'`
   - **Solution**: Fixed in latest version - timeout parameters removed

3. **No Fallback Working**
   - **Check**: Ensure `OPENAI_API_KEY` is set
   - **Check**: Verify OpenAI API key is valid

### Log Messages to Watch For

**Successful Fallback:**
```
INFO: ELEVENLABS_TTS_ERROR | will use OpenAI fallback
INFO: FALLBACK_TTS_CONFIGURED | primary=ElevenLabs | fallback=OpenAI
```

**ElevenLabs Disabled:**
```
INFO: ELEVENLABS_DISABLED | using OpenAI TTS only
```

**Direct OpenAI Usage:**
```
INFO: ELEVENLABS_FAILED_FALLBACK | using OpenAI TTS directly
```

## Performance Notes

- **ElevenLabs**: Higher quality but can timeout
- **OpenAI**: Reliable and fast, good quality
- **Fallback**: Immediate switch (no retries) for faster recovery
- **Voice Quality**: OpenAI voices are very good and similar to ElevenLabs

## Best Practices

1. **Always set OPENAI_API_KEY** as a reliable fallback
2. **Use DISABLE_ELEVENLABS=true** if ElevenLabs causes persistent issues
3. **Monitor logs** for fallback activity
4. **Monitor logs** for fallback activity during agent initialization
