# LiveKit Voice Agent System

This directory contains the LiveKit-based voice agent system for handling inbound and outbound calls with AI assistants.

## 📁 Directory Structure

```
livekit/
├── README.md                    # This file
├── main.py                      # Main entry point (simplified)
├── requirements.txt             # Python dependencies
├── config/
│   ├── __init__.py
│   ├── settings.py             # Configuration management
│   └── database.py             # Database connection utilities
├── core/
│   ├── __init__.py
│   ├── call_processor.py       # Main call processing logic
│   ├── inbound_handler.py      # Inbound call handling
│   └── outbound_handler.py     # Outbound call handling
├── services/
│   ├── __init__.py
│   ├── assistant.py            # Basic assistant implementation
│   ├── rag_assistant.py        # RAG-enabled assistant
│   ├── rag_service.py          # RAG knowledge base service
│   └── recording_service.py    # Call recording service
├── integrations/
│   ├── __init__.py
│   ├── calendar_api.py         # Cal.com calendar integration
│   ├── n8n_integration.py      # N8N webhook integration
│   └── supabase_client.py      # Supabase database client
├── utils/
│   ├── __init__.py
│   ├── helpers.py              # General utility functions
│   ├── call_analysis.py        # Call status and analysis
│   └── logging_config.py       # Logging configuration
```

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run the agent:**
   ```bash
   python main.py
   ```

## 🔧 Configuration

All configuration is managed through environment variables and the `config/settings.py` file.

### Required Environment Variables:
- `LIVEKIT_URL` - LiveKit server URL
- `LIVEKIT_API_KEY` - LiveKit API key
- `LIVEKIT_API_SECRET` - LiveKit API secret
- `OPENAI_API_KEY` - OpenAI API key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE` - Supabase service role key

## 📚 Key Components

### Core System
- **`main.py`** - Entry point, initializes and starts the agent
- **`core/call_processor.py`** - Main call processing orchestration
- **`core/inbound_handler.py`** - Handles incoming calls
- **`core/outbound_handler.py`** - Handles outgoing calls

### Services
- **`services/assistant.py`** - Basic AI assistant with calendar booking
- **`services/rag_assistant.py`** - Enhanced assistant with knowledge base integration
- **`services/rag_service.py`** - RAG (Retrieval-Augmented Generation) service
- **`services/recording_service.py`** - Call recording management

### Integrations
- **`integrations/calendar_api.py`** - Cal.com calendar integration
- **`integrations/n8n_integration.py`** - N8N webhook and data collection
- **`integrations/supabase_client.py`** - Database operations

### Utilities
- **`utils/helpers.py`** - General utility functions
- **`utils/call_analysis.py`** - Call status determination and analysis
- **`utils/logging_config.py`** - Centralized logging configuration

## 🔄 Data Flow

1. **Call Initiation** → `main.py` receives call
2. **Call Processing** → `core/call_processor.py` determines call type
3. **Assistant Selection** → Choose between basic or RAG assistant
4. **Data Collection** → N8N integration collects user information
5. **Call Completion** → Save call data and send webhooks

## 🧪 Testing

Run tests with:
```bash
python -m pytest tests/
```

## 📝 Development

### Adding New Features:
1. Create new modules in appropriate directories
2. Update `__init__.py` files for imports
3. Add configuration in `config/settings.py`
4. Write tests in `tests/`
5. Update this README

### Code Style:
- Follow PEP 8
- Use type hints
- Add docstrings for all functions
- Keep functions focused and small
