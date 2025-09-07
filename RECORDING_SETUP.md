# Call Recording Setup

This document explains how to set up call recording for your LiveKit voice agent using Twilio SIP trunk recording.

## Environment Variables

Add these environment variables to your `.env` file:

```env
# Twilio credentials
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
```

## How It Works

1. **Trunk-Level Recording**: Recording is enabled at the SIP trunk level, so all calls through the trunk are automatically recorded
2. **Dual Channel Recording**: Records both inbound and outbound audio from the "ringing" state
3. **Call SID Tracking**: The system extracts the Twilio Call SID and saves it to call history
4. **Automatic Processing**: No manual intervention needed - recording happens automatically

## Features

- **Trunk-Level Recording**: All calls through the trunk are recorded automatically
- **Dual Channel**: Records both inbound and outbound audio separately
- **From Ringing**: Recording starts from the ringing state, not just when answered
- **Call History**: Saves Call SID to Supabase for tracking
- **No API Calls**: No need to make recording API calls during the call

## Setup Instructions

### For New Trunks
New trunks are automatically created with recording enabled.

### Get Recording Information
To get recording information for a call:

```bash
GET /api/v1/call/{callSid}/recordings?accountSid=your_account_sid&authToken=your_auth_token
```

## Troubleshooting

### Recording Not Working
- Check that the trunk has recording enabled: `recording=dual-record-from-ringing`
- Verify Twilio credentials are correct
- Check trunk configuration in Twilio Console

### Call SID Not Found
- Verify that your SIP trunk is properly configured
- Check participant attributes in LiveKit logs
- Ensure the trunk is using the correct Twilio account

### Check Trunk Recording Status
You can verify recording is enabled by checking the trunk configuration in the Twilio Console or using the API.

## Database Schema

The recording information is stored in the `call_history` table:

```sql
-- Add these columns if they don't exist
ALTER TABLE call_history ADD COLUMN IF NOT EXISTS call_sid TEXT;
ALTER TABLE call_history ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE call_history ADD COLUMN IF NOT EXISTS recording_status TEXT;
ALTER TABLE call_history ADD COLUMN IF NOT EXISTS recording_duration INTEGER;
```

## API Endpoints

- `GET /api/v1/call/{callSid}/recordings` - Get recording info for a call
- `GET /api/v1/recording/health` - Health check