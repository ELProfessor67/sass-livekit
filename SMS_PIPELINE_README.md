# SMS Pipeline Implementation

This document describes the SMS pipeline implementation for handling automated SMS conversations with AI assistants.

## Overview

The SMS pipeline allows users to send text messages to phone numbers assigned to assistants, and receive AI-generated responses based on the assistant's configuration.

## Architecture

```
User SMS → Twilio → SMS Webhook → Assistant Lookup → AI Processing → Twilio API → User
```

## Components

### 1. SMS Webhook (`server/sms-webhook.js`)
- Receives incoming SMS from Twilio
- Processes SMS and triggers response generation
- Handles error cases gracefully

### 2. SMS Database Service (`server/services/sms-database-service.js`)
- Manages database operations for SMS
- Handles conversation state tracking
- Stores SMS message history

### 3. SMS AI Service (`server/services/sms-ai-service.js`)
- Generates AI responses using OpenAI
- Manages conversation context
- Handles first message vs ongoing conversation logic

### 4. SMS Assistant Service (`server/services/sms-assistant-service.js`)
- Orchestrates the entire SMS flow
- Manages Twilio API calls
- Handles error responses

## Database Schema

### Assistant Table (Updated)
- `first_sms` - First message sent when SMS conversation starts
- `sms_prompt` - System prompt for SMS conversations

### Phone Number Table
- `inbound_assistant_id` - Links phone numbers to assistants

### SMS Messages Table
- Stores all SMS conversation history
- Tracks message direction (inbound/outbound)
- Maintains conversation context

## Environment Variables

Add these to your `.env` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Ngrok (for webhooks)
NGROK_AUTHTOKEN=your_ngrok_auth_token
```

## API Endpoints

### SMS Webhook
- **POST** `/api/v1/sms/webhook/sms` - Receives incoming SMS from Twilio
- **GET** `/api/v1/sms/webhook/sms/health` - Health check
- **POST** `/api/v1/sms/test` - Test SMS functionality

## Setup Instructions

### 1. Database Migration
Run the SQL migration to add SMS fields to the assistant table:

```sql
-- Add SMS fields to assistant table
ALTER TABLE public.assistant 
ADD COLUMN first_sms TEXT,
ADD COLUMN sms_prompt TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.assistant.first_sms IS 'First SMS message sent by the assistant when SMS conversation starts';
COMMENT ON COLUMN public.assistant.sms_prompt IS 'System prompt used for SMS conversations with the assistant';

-- Create index for better query performance on SMS fields
CREATE INDEX idx_assistant_sms_fields ON public.assistant(first_sms, sms_prompt) 
WHERE first_sms IS NOT NULL OR sms_prompt IS NOT NULL;
```

### 2. Configure Twilio Webhook
Set your Twilio phone number's webhook URL to:
```
https://your-domain.com/api/v1/sms/webhook/sms
```

### 3. Start the Server
```bash
npm run backend
```

## Usage

### 1. Configure Assistant SMS Settings
In the assistant creation form, fill in:
- **First SMS Message**: Message sent when conversation starts
- **SMS System Prompt**: Instructions for AI behavior in SMS

### 2. Assign Phone Number to Assistant
Link a Twilio phone number to an assistant in the phone number management section.

### 3. Test SMS
Send a text message to the assigned phone number. The assistant will:
- Send the first SMS message if it's a new conversation
- Generate AI responses for ongoing conversations
- Handle conversation end keywords (end, stop, goodbye, etc.)

## Conversation Management

### New vs Ongoing Conversations
- **New**: No previous messages or last message > 30 minutes ago
- **Ongoing**: Recent messages within 30-minute window

### Session Timeout
- Conversations automatically end after 30 minutes of inactivity
- Users can explicitly end with keywords: "end", "stop", "goodbye", "bye", "quit", "exit", "cancel"

## Testing

### Test Endpoint
```bash
curl -X POST http://localhost:4000/api/v1/sms/test \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "message": "Hello, can you help me?"
  }'
```

### Health Check
```bash
curl http://localhost:4000/api/v1/sms/webhook/sms/health
```

## Error Handling

The system handles various error cases:
- No assistant assigned to phone number
- Database connection issues
- OpenAI API failures
- Twilio API errors

Error responses are sent to users when possible, with fallback messages for critical failures.

## Monitoring

Check server logs for:
- SMS processing status
- Database query results
- AI response generation
- Twilio API calls
- Error conditions

## Security Considerations

- Webhook endpoints should be secured in production
- Validate incoming webhook data
- Rate limiting for SMS endpoints
- Monitor for abuse patterns
- Secure API keys and credentials
