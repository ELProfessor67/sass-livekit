# Call Recording Setup

This document explains how to set up automatic call recording for your LiveKit + Twilio integration.

## Environment Variables

Add these environment variables to your `.env` file:

```bash
# Twilio Credentials (required for recording)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Recording Configuration
ENABLE_CALL_RECORDING=true
# RECORDING_STATUS_CALLBACK_URL - Not needed (disabled)

# Your existing LiveKit and other credentials...
```

## How It Works

1. **Call Comes In**: When someone calls your Twilio number, it connects via SIP trunk to LiveKit
2. **Call SID Detection**: The system extracts the Twilio Call SID from the LiveKit room context (Provider ID)
3. **Recording Starts**: Automatically starts recording the call using Twilio's API
4. **Call History**: Basic recording information is saved to your Supabase database

## Recording Features

- **Dual Channel**: Records both inbound and outbound audio
- **Transcription**: Automatically transcribes the call
- **Database Storage**: Basic recording information stored in call_history table

## Testing

1. Make sure your environment variables are set
2. Make a test call to your Twilio number
3. Check the logs for recording status messages:
   - `CALL_SID_FROM_SIP` - Call SID found
   - `RECORDING_STARTED` - Recording started successfully
   - `RECORDING_SKIPPED` - Recording disabled or no Call SID found

## Troubleshooting

### No Call SID Found
- Check that you're using SIP trunk (not webhook)
- Verify LiveKit is properly configured with Twilio
- Check logs for `ROOM_DEBUG` and `SIP_DEBUG` output

### Recording Not Starting
- Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are correct
- Check `ENABLE_CALL_RECORDING=true`
- Ensure your Twilio account has recording permissions

### Recording Not Working
- Check Twilio account has recording permissions
- Verify Call SID is being detected in logs

## Database Schema

The recording information is stored in the `call_history` table:

```sql
-- Add these columns if they don't exist
ALTER TABLE call_history ADD COLUMN IF NOT EXISTS recording_sid TEXT;
ALTER TABLE call_history ADD COLUMN IF NOT EXISTS call_sid TEXT;
ALTER TABLE call_history ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE call_history ADD COLUMN IF NOT EXISTS recording_status TEXT;
ALTER TABLE call_history ADD COLUMN IF NOT EXISTS recording_duration INTEGER;
```

## API Endpoints

- `GET /api/v1/recording/:callSid` - Get recording info for a call
- `GET /api/v1/recording/health` - Health check
