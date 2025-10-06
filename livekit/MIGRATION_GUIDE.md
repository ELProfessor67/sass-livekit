# LiveKit Agents Migration Guide

## Overview
This guide helps you migrate from your custom implementation to the proper LiveKit Agents framework.

## What Changed

### 1. Main Entry Point (`main.py`)
**BEFORE (2523 lines):**
- Custom WebRTC handling
- Manual session management
- Complex state tracking
- Custom audio pipeline

**AFTER (`main_new_livekit.py` - 230 lines):**
- Uses `AgentSession` for session management
- Proper `JobContext` handling
- Clean separation of concerns
- Framework-managed audio pipeline

### 2. Agent Classes
**BEFORE (`services/assistant.py` & `services/rag_assistant.py`):**
- Custom classes not inheriting from LiveKit `Agent`
- Manual conversation state management
- Complex turn gating logic

**AFTER (`services/booking_agent.py` & `services/rag_agent.py`):**
- Proper `Agent` subclasses
- LiveKit-managed conversation flow
- Built-in state management
- Framework-provided lifecycle methods

### 3. Function Tools
**BEFORE:**
- Manual turn gating with `_turn_gate()`
- Complex state validation
- Custom error handling

**AFTER:**
- Clean `@function_tool` decorators
- Framework-managed tool execution
- Built-in error handling

## Migration Steps

### Step 1: Backup Your Current Implementation
```bash
cp main.py main_old_backup.py
cp services/assistant.py services/assistant_old_backup.py
cp services/rag_assistant.py services/rag_assistant_old_backup.py
```

### Step 2: Replace Main File
```bash
# Replace your main.py with the new implementation
cp main_new_livekit.py main.py
```

### Step 3: Update Agent Classes
```bash
# Replace your agent classes
cp services/booking_agent.py services/assistant.py
cp services/rag_agent.py services/rag_assistant.py
```

### Step 4: Test the Implementation
```bash
python test_livekit_implementation.py
```

### Step 5: Update Environment Variables
Ensure you have these environment variables set:
```bash
LIVEKIT_URL=your_livekit_url
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
OPENAI_API_KEY=your_openai_key
```

## Key Benefits of the New Implementation

### 1. **Framework Compliance**
- Follows LiveKit Agents patterns
- Uses built-in session management
- Proper agent lifecycle handling

### 2. **Reduced Complexity**
- 90% reduction in main.py size (2523 → 230 lines)
- Eliminated custom WebRTC handling
- Removed manual state management

### 3. **Better Error Handling**
- Framework-provided error recovery
- Built-in metrics and telemetry
- Proper logging integration

### 4. **Improved Performance**
- Optimized audio pipeline
- Better turn detection
- Efficient resource management

### 5. **Enhanced Features**
- Built-in interruption handling
- Automatic turn detection
- Framework-managed plugins

## Function Tool Migration

### Before (Custom Implementation)
```python
def _turn_gate(self, ctx: RunContext) -> Optional[str]:
    """Manual turn gating logic"""
    sid = getattr(ctx, "speech_id", None)
    if sid != self._last_speech_id:
        self._last_speech_id = sid
        self._calls_this_speech = 1
        return None
    # ... complex logic
```

### After (LiveKit Framework)
```python
@function_tool(name="confirm_wants_to_book_yes")
async def confirm_wants_to_book_yes(self, ctx: RunContext) -> str:
    """Called when user confirms they want to book an appointment."""
    self._booking_intent = True
    # ... simple, clean logic
    return "Great—what's the reason for the visit?"
```

## Session Management Migration

### Before (Custom Implementation)
```python
# Manual session creation and management
session = CustomSession(
    stt=stt_provider,
    llm=llm_provider,
    tts=tts_provider,
    # ... complex configuration
)
await session.run(user_input="")
```

### After (LiveKit Framework)
```python
# Framework-managed session
session = AgentSession(
    vad=silero.VAD.load(),
    stt=openai.STT(model="nova-3"),
    llm=openai.LLM(model="gpt-4o-mini"),
    tts=openai.TTS(voice="ash"),
    allow_interruptions=True,
    min_endpointing_delay=0.5,
    max_endpointing_delay=6.0,
)

await session.start(agent=agent, room=ctx.room)
```

## Testing Your Migration

### 1. Run the Test Suite
```bash
python test_livekit_implementation.py
```

### 2. Test Console Mode
```bash
python main.py console
```

### 3. Test Development Mode
```bash
python main.py dev
```

### 4. Test Production Mode
```bash
python main.py start
```

## Troubleshooting

### Common Issues

1. **Import Errors**
   - Ensure all dependencies are installed
   - Check Python path configuration

2. **Agent Not Responding**
   - Verify environment variables
   - Check LiveKit server connection

3. **Function Tools Not Working**
   - Ensure proper `@function_tool` decorators
   - Check tool parameter types

4. **RAG Not Working**
   - Verify knowledge base configuration
   - Check RAG service integration

### Debug Mode
Enable debug logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Performance Comparison

| Metric | Old Implementation | New Implementation | Improvement |
|--------|-------------------|-------------------|-------------|
| **Main File Size** | 2523 lines | 230 lines | 90% reduction |
| **Agent Class Size** | 506 lines | 300 lines | 40% reduction |
| **Function Tools** | Manual gating | Framework managed | Simplified |
| **Error Handling** | Custom try/catch | Built-in recovery | More robust |
| **Session Management** | Manual WebRTC | Framework managed | Optimized |
| **Turn Detection** | Custom logic | Multiple strategies | More accurate |

## Next Steps

1. **Deploy the new implementation**
2. **Monitor performance metrics**
3. **Test with real calls**
4. **Optimize based on usage patterns**
5. **Add additional LiveKit features** (metrics, telemetry, etc.)

## Support

If you encounter issues during migration:
1. Check the LiveKit Agents documentation
2. Review the test suite output
3. Enable debug logging
4. Compare with agents-main examples

The new implementation follows LiveKit best practices and should provide better performance, reliability, and maintainability.
