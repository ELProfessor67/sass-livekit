# RAG Integration for LiveKit Voice Agents

This document describes the Retrieval-Augmented Generation (RAG) integration that allows LiveKit voice agents to access knowledge bases for enhanced context and information retrieval.

## Overview

The RAG integration enables voice agents to:
- Automatically retrieve relevant context from knowledge bases during conversations
- Answer questions using information from uploaded documents
- Provide detailed information about specific topics
- Maintain conversation context while accessing external knowledge

## Architecture

### Components

1. **RAGService** (`services/rag_service.py`)
   - Handles communication with Pinecone knowledge bases
   - Manages context retrieval and formatting
   - Provides caching and deduplication

2. **RAGAssistant** (`services/rag_assistant.py`)
   - Enhanced Assistant class with RAG capabilities
   - Implements `on_user_turn_completed` for automatic context retrieval
   - Provides RAG-specific tool functions

3. **Main Integration** (`main.py`)
   - Automatically selects RAG-enabled assistant when knowledge base is available
   - Loads knowledge base configuration from assistant data
   - Adds RAG tools to agent instructions

## Features

### Automatic Context Retrieval

The RAG assistant automatically retrieves relevant context when users ask questions:

```python
async def on_user_turn_completed(
    self, 
    turn_ctx: ChatContext, 
    new_message: ChatMessage,
) -> None:
    # Automatically retrieves context from knowledge base
    # and adds it to the conversation
```

### RAG-Specific Tools

The RAG assistant provides additional tools for knowledge base interaction:

- `search_knowledge(query)` - Search for information on a specific topic
- `get_detailed_info(topic)` - Get comprehensive information about a topic

### Smart Context Filtering

The system intelligently determines when to perform RAG lookups:
- Skips very short inputs
- Avoids redundant lookups
- Excludes booking-related queries
- Filters out simple greetings

## Configuration

### Environment Variables

```bash
# Required for RAG functionality
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PINECONE_API_KEY=your_pinecone_api_key
```

### Assistant Configuration

To enable RAG for an assistant, ensure the assistant record has:
- `knowledge_base_id` - ID of the associated knowledge base
- `company_id` - Company ID for Pinecone assistant naming

### Knowledge Base Setup

1. Create a knowledge base in the system
2. Upload documents to the knowledge base
3. Ensure Pinecone assistant is created and configured
4. Associate the knowledge base with the assistant

## Usage

### Automatic RAG

When an assistant has a knowledge base configured, RAG is automatically enabled:

```python
# The system automatically detects knowledge base availability
if knowledge_base_id and company_id:
    agent = RAGAssistant(
        instructions=instructions,
        calendar=calendar,
        knowledge_base_id=knowledge_base_id,
        company_id=company_id
    )
```

### Manual Knowledge Search

Users can explicitly search the knowledge base:

```
User: "Search for information about our refund policy"
Agent: "Based on our knowledge base: [retrieved context about refund policy]"
```

### Detailed Information Requests

Users can request comprehensive information:

```
User: "Tell me about our product features"
Agent: "Here's detailed information about product features: [comprehensive context from multiple sources]"
```

## Implementation Details

### Context Retrieval Process

1. **Query Analysis**: Determine if RAG lookup is needed
2. **Knowledge Base Search**: Query Pinecone assistant for relevant snippets
3. **Context Formatting**: Format snippets for LLM consumption
4. **Context Injection**: Add context to conversation history

### Caching Strategy

- Context is cached to avoid redundant lookups
- Cache size is limited to prevent memory issues
- Cache keys are based on normalized query text

### Error Handling

- Graceful fallback when knowledge base is unavailable
- Logging for debugging and monitoring
- Continues conversation even if RAG fails

## Testing

Run the test script to verify RAG integration:

```bash
cd livekit
python test_rag_integration.py
```

The test script will:
- Verify RAG service initialization
- Test context retrieval functionality
- Validate assistant creation and configuration
- Check RAG lookup decision logic

## Monitoring and Debugging

### Logging

The RAG integration provides detailed logging:

```
RAG_SERVICE | Retrieved 5 context snippets
RAG_ASSISTANT | Using RAG-enabled assistant with KB: kb-123
RAG_ASSISTANT | Added context to chat: 1250 characters
```

### Performance Considerations

- Context retrieval is asynchronous to avoid blocking
- Maximum context length is configurable (default: 4000 characters)
- Snippet deduplication prevents redundant information

## Troubleshooting

### Common Issues

1. **No Context Retrieved**
   - Check if knowledge base is properly configured
   - Verify Pinecone assistant exists
   - Ensure documents are uploaded and processed

2. **RAG Not Triggering**
   - Check if assistant has `knowledge_base_id` set
   - Verify `company_id` is available
   - Review query filtering logic

3. **Performance Issues**
   - Adjust `max_context_length` setting
   - Check Pinecone API response times
   - Review cache configuration

### Debug Mode

Enable detailed logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Future Enhancements

- Support for multiple knowledge bases per assistant
- Dynamic context length based on query complexity
- Integration with other vector databases
- Advanced query preprocessing and optimization
- Real-time knowledge base updates

## Dependencies

- `pinecone-client>=3.0.0` - Pinecone vector database client
- `supabase>=2.4.0` - Supabase database client
- `livekit-agents` - LiveKit agent framework

## Security Considerations

- Knowledge base access is scoped to company/assistant
- Context is not persisted beyond conversation
- API keys are managed through environment variables
- No sensitive data is logged in context retrieval
