# SMS Implementation for Conversation Page

This document outlines the SMS sending and receiving functionality implemented in the conversation page using Twilio.

## Overview

The SMS functionality allows users to:
- Send SMS messages to contacts from the conversation page
- Receive and view incoming SMS messages
- See SMS messages alongside call history in the conversation thread
- Track SMS message status and delivery

## Architecture

### Backend Components

#### 1. SMS API Endpoints (`server/twilio-sms.js`)
- **POST `/api/v1/twilio/sms/send`** - Send SMS messages
- **GET `/api/v1/twilio/sms/conversation/:conversationId`** - Get SMS messages for a conversation
- **POST `/api/v1/twilio/sms/webhook`** - Receive incoming SMS messages from Twilio
- **POST `/api/v1/twilio/sms/status-callback`** - Handle SMS delivery status updates

#### 2. Database Schema (`supabase/migrations/20250103000002_create_sms_messages_table.sql`)
- `sms_messages` table to store SMS data
- Automatic SMS count updates for conversations
- Row Level Security (RLS) policies for data protection

### Frontend Components

#### 1. SMS Service (`src/lib/api/sms/smsService.ts`)
- `SMSService` class for handling SMS operations
- Phone number validation and formatting
- Integration with Twilio credentials

#### 2. Updated Components
- **MessageThread** - Displays SMS messages alongside calls
- **MessageBubble** - Renders SMS messages with proper styling
- **ModernMessageInput** - Toggle between SMS and call modes
- **Conversation Types** - Extended to include SMS data

## Features

### SMS Sending
- Toggle between SMS and call modes in the message input
- Phone number validation and formatting
- Real-time status updates
- Error handling with user-friendly messages

### SMS Receiving
- Webhook endpoint for incoming messages
- Automatic conversation association
- Real-time message display
- Status tracking (sent, delivered, failed)

### Message Display
- SMS messages appear in conversation thread
- Different styling for SMS vs calls
- Message status indicators
- Timestamp and metadata display

## Setup Instructions

### 1. Environment Variables
Add the following to your `.env` file:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BACKEND_URL=http://localhost:4000
```

### 2. Database Migration
Run the SMS messages migration:
```bash
supabase migration up
```

### 3. Twilio Configuration
1. Set up Twilio credentials in your app settings
2. Configure webhook URLs in Twilio console:
   - SMS webhook: `https://yourdomain.com/api/v1/twilio/sms/webhook`
   - Status callback: `https://yourdomain.com/api/v1/twilio/sms/status-callback`

### 4. Phone Number Setup
- Purchase a Twilio phone number
- Configure it in your Twilio credentials
- Update the `from` number in the SMS service

## Usage

### Sending SMS
1. Navigate to the conversation page
2. Select a conversation
3. In the message input, ensure "SMS" mode is selected
4. Type your message and press Enter or click Send

### Receiving SMS
- Incoming SMS messages are automatically received via webhook
- Messages appear in the conversation thread
- Status updates are handled automatically

## API Reference

### Send SMS
```typescript
const result = await sendSMS({
  to: '+1234567890',
  from: '+0987654321',
  body: 'Hello, this is a test message',
  conversationId: 'conv_123'
});
```

### Get SMS Messages
```typescript
const messages = await getSMSMessages('conv_123');
```

## Database Schema

### sms_messages Table
```sql
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY,
  message_sid TEXT UNIQUE NOT NULL,
  conversation_id UUID REFERENCES conversations(id),
  user_id UUID REFERENCES auth.users(id),
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  body TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  num_segments TEXT,
  price TEXT,
  price_unit TEXT,
  date_created TIMESTAMPTZ NOT NULL,
  date_sent TIMESTAMPTZ,
  date_updated TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Security

- Row Level Security (RLS) enabled on SMS messages table
- Users can only access their own SMS messages
- Webhook signature validation (recommended for production)
- Input validation and sanitization

## Error Handling

- Phone number validation
- Twilio API error handling
- Database error handling
- User-friendly error messages
- Retry mechanisms for failed requests

## Future Enhancements

- MMS support for media messages
- Message templates
- Bulk SMS sending
- Advanced message filtering
- Message search functionality
- Delivery reports and analytics

## Troubleshooting

### Common Issues

1. **SMS not sending**
   - Check Twilio credentials
   - Verify phone number format
   - Check account balance

2. **Messages not appearing**
   - Check webhook configuration
   - Verify database connection
   - Check console for errors

3. **Status not updating**
   - Verify status callback URL
   - Check webhook endpoint logs

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your environment variables.

## Support

For issues or questions regarding the SMS implementation, please check:
1. Twilio documentation
2. Console logs for error messages
3. Database query logs
4. Network request logs in browser dev tools

