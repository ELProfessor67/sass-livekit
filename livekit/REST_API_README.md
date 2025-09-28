# REST API LLM Integration for sass-livekit

This implementation adds REST API support for LLM providers, similar to urban-new's approach. It provides better compatibility with certain models and more control over the conversation flow.

## Features

- **REST API Support**: Use REST API instead of WebSocket for supported models
- **Streaming Responses**: Real-time streaming of LLM responses
- **Conversation History**: Automatic management of conversation context
- **Fallback Support**: Automatic fallback to WebSocket if REST API fails
- **Configurable**: Easy configuration via environment variables

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Enable REST API for supported models
USE_REST_API=true

# REST API Settings
REST_API_TIMEOUT=30
REST_API_MAX_RETRIES=3
REST_API_BASE_URL=https://api.openai.com/v1

# Your existing API keys
OPENAI_API_KEY=your_openai_api_key_here
```

### Supported Models

The following models will use REST API when `USE_REST_API=true`:

- `gpt-4o-mini`
- `gpt-4o`
- `gpt-4`
- `gpt-3.5-turbo`

## Usage

The REST API integration is automatically used when:

1. `USE_REST_API=true` is set in environment
2. The configured model is in the supported models list
3. The model is not using Groq or Cerebras (which have their own implementations)

## Files Added

- `services/rest_llm_service.py` - Core REST LLM service implementation
- `config/rest_api_config.py` - Configuration management
- Updated `main.py` - Integration with existing LiveKit agent

## How It Works

1. **Model Detection**: The system checks if the configured model should use REST API
2. **REST Service**: Creates a `RestLLMService` instance that handles HTTP requests
3. **Streaming**: Implements streaming responses using Server-Sent Events (SSE)
4. **History Management**: Automatically manages conversation history
5. **LiveKit Integration**: Provides a LiveKit-compatible interface

## Benefits

- **Better Compatibility**: Some models work better with REST API
- **More Control**: Direct control over request/response handling
- **Debugging**: Easier to debug API calls and responses
- **Flexibility**: Can easily switch between REST and WebSocket

## Testing

To test the REST API integration:

1. Set `USE_REST_API=true` in your environment
2. Use a supported model (e.g., `gpt-4o-mini`)
3. Start a call and check logs for "REST_LLM_CONFIGURED" messages
4. Monitor the conversation flow

## Troubleshooting

- **REST API not used**: Check that `USE_REST_API=true` and model is supported
- **Connection errors**: Verify API keys and network connectivity
- **Streaming issues**: Check timeout settings and retry configuration
