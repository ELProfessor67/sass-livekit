# Outbound Trunk Implementation

This document explains the implementation of automatic outbound trunk creation and LiveKit SIP-based campaign calling.

## Overview

The system now automatically creates both inbound and outbound trunks when assigning phone numbers to assistants, and uses LiveKit SIP participants for campaign calls instead of direct Twilio calls.

## Changes Made

### 1. Database Schema Updates

**File:** `supabase/migrations/20250113000002_add_outbound_trunk_to_phone_number.sql`

Added two new columns to the `phone_number` table:
- `outbound_trunk_id`: Stores the LiveKit outbound trunk ID
- `outbound_trunk_name`: Stores the LiveKit outbound trunk name

### 2. Enhanced Assistant Trunk Creation

**File:** `server/livekit-per-assistant-trunk.js`

- Modified `createAssistantTrunk()` function to create both inbound and outbound trunks
- Updated deletion logic to handle both trunk types
- Enhanced return object to include outbound trunk information

**Key Changes:**
```javascript
// Creates both inbound and outbound trunks
const trunk = await lk.createSipInboundTrunk(trunkName, [e164], {...});
const outboundTrunk = await lk.createSipOutboundTrunk(outboundTrunkName, [e164], {...});
```

### 3. Updated Phone Number Assignment

**File:** `src/components/assistants/tabs/PhoneNumbersTab.tsx`

- Reordered operations to create LiveKit trunks before database mapping
- Pass outbound trunk information to the mapping API
- Enhanced error handling for trunk creation

**File:** `server/twilio-admin.js`

- Updated `/map` endpoint to accept and store outbound trunk information
- Enhanced database upsert to include new trunk fields

### 4. New LiveKit Outbound Calls Service

**File:** `server/livekit-outbound-calls.js`

New service providing:
- `POST /api/v1/livekit/outbound-calls/create-participant` - Create SIP participants for outbound calls
- `GET /api/v1/livekit/outbound-calls/trunk/:assistantId` - Get outbound trunk for an assistant
- `GET /api/v1/livekit/outbound-calls/trunks` - List all outbound trunks

### 5. Updated Campaign Execution Engine

**File:** `server/campaign-execution-engine.js`

- Replaced direct Twilio calls with LiveKit SIP participants
- Enhanced to use outbound trunks for campaign calls
- Improved error handling and logging

**Key Changes:**
```javascript
// Old: Direct Twilio call
const call = await twilio.calls.create({...});

// New: LiveKit SIP participant
const participantResponse = await fetch(`${baseUrl}/api/v1/livekit/outbound-calls/create-participant`, {
  method: 'POST',
  body: JSON.stringify({
    outboundTrunkId,
    phoneNumber: campaignCall.phone_number,
    roomName,
    // ... other options
  })
});
```

### 6. Server Registration

**File:** `server/index.js`

- Added import for `livekitOutboundCallsRouter`
- Registered the new router at `/api/v1/livekit`

## How It Works

### 1. Assistant Setup Flow

1. User assigns a phone number to an assistant
2. System creates both inbound and outbound LiveKit trunks
3. Inbound trunk handles incoming calls to the assistant
4. Outbound trunk handles outgoing calls from the assistant
5. Both trunk IDs are stored in the database

### 2. Campaign Call Flow

1. Campaign execution engine gets next call from queue
2. System looks up the assistant's outbound trunk ID
3. Creates a LiveKit SIP participant using the outbound trunk
4. SIP participant initiates call to the target phone number
5. Call is routed through LiveKit with AI agent handling

### 3. Benefits

- **Unified Infrastructure**: Both inbound and outbound calls use LiveKit
- **Better Call Quality**: LiveKit provides superior audio processing
- **AI Integration**: Seamless integration with AI agents
- **Scalability**: LiveKit handles scaling better than direct Twilio calls
- **Cost Efficiency**: Potentially lower costs through LiveKit's infrastructure

## Configuration Requirements

### Environment Variables

Ensure these are set:

**LiveKit Configuration:**
- `LIVEKIT_HOST`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

**Server Configuration:**
- `NGROK_URL` or `BACKEND_URL`

**SIP Provider Configuration (NEW - Twilio-specific):**
- `SIP_PROVIDER_ADDRESS` - Twilio trunk address (e.g., `your-trunk-sid.pstn.twilio.com`) - Optional
- `SIP_DESTINATION_COUNTRY` - Country code for call routing (e.g., `US`) - Optional
- **Authentication**: Automatically uses existing `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`

**Note**: Since you're already using Twilio, the system automatically uses your existing Twilio credentials for SIP authentication. No additional setup required!

See `SIP_ENVIRONMENT_SETUP.md` for detailed configuration instructions.

### SIP Provider Setup (Twilio)

The outbound trunks are automatically configured with your existing Twilio setup:

```javascript
// Automatic Twilio configuration
const outboundTrunk = await lk.createSipOutboundTrunk(
  outboundTrunkName,
  sipAddress,        // e.g., 'pstn.twilio.com' or 'TK123.pstn.twilio.com'
  destinationCountry, // e.g., 'US'
  [e164],           // Phone number
  {
    authUsername: process.env.TWILIO_ACCOUNT_SID,  // Your existing Twilio Account SID
    authPassword: process.env.TWILIO_AUTH_TOKEN,   // Your existing Twilio Auth Token
    metadata: JSON.stringify({
      kind: 'per-assistant-outbound-trunk',
      assistantId,
      assistantName,
      phoneNumber: e164,
      createdAt: new Date().toISOString(),
    })
  }
);
```

**No additional Twilio configuration needed!** The system uses your existing Twilio credentials.

## Testing

To test the implementation:

1. **Assign Phone Number**: Assign a phone number to an assistant
2. **Verify Trunks**: Check that both inbound and outbound trunks are created
3. **Create Campaign**: Set up a campaign with the assistant
4. **Execute Campaign**: Start the campaign and verify calls are made via LiveKit SIP

## Migration Notes

- Existing phone numbers will need to have outbound trunks created manually
- The system gracefully handles missing outbound trunks (shows appropriate error messages)
- Campaign calls will fail if no outbound trunk is configured for the assistant

## Troubleshooting

### Common Issues

1. **No Outbound Trunk Found**: Ensure the assistant has a phone number assigned
2. **SIP Provider Authentication**: Verify credentials are correct in trunk configuration
3. **Call Failures**: Check LiveKit logs and SIP provider logs for detailed error information

### Debugging

Enable detailed logging by checking:
- LiveKit server logs
- Campaign execution engine logs
- SIP participant creation logs
