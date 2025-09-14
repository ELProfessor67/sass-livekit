# SIP Trunk Creation Flow When Assigning Phone Number to Assistant

## Overview
When a phone number is assigned to an assistant, the system creates both **inbound** and **outbound** SIP trunks in LiveKit, along with the necessary Twilio configuration.

## Complete Flow

### 1. Frontend Assignment Process (`PhoneNumbersTab.tsx`)

When a user assigns a phone number to an assistant:

```typescript
// Step 1: Attach phone number to Twilio trunk
const attachResp = await fetch(`${base}/api/v1/twilio/attach`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phoneSid: row.id }),
});

// Step 2: Create LiveKit trunks (inbound + outbound)
const livekitResp = await fetch(`${base}/api/v1/livekit/assistant-trunk`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    assistantId,
    assistantName,
    phoneNumber: row.number,
  }),
});

// Step 3: Map phone number to assistant in database
const mapResp = await fetch(`${base}/api/v1/twilio/map`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    phoneSid: row.id,
    assistantId,
    label: row.label || undefined,
    outboundTrunkId: livekitTrunk?.outboundTrunkId,
    outboundTrunkName: livekitTrunk?.outboundTrunkName,
  }),
});
```

### 2. LiveKit Trunk Creation (`livekit-per-assistant-trunk.js`)

The `/api/v1/livekit/assistant-trunk` endpoint creates:

#### A. Inbound Trunk
```javascript
const trunk = await lk.createSipInboundTrunk(
  trunkName,                    // e.g., "ast-assistant-name-1234567890"
  [e164],                       // Phone number in E.164 format
  {
    metadata: JSON.stringify({
      kind: 'per-assistant-trunk',
      assistantId,
      assistantName,
      phoneNumber: e164,
      createdAt: new Date().toISOString(),
    }),
  }
);
```

#### B. Outbound Trunk (Elastic SIP Trunk)
```javascript
const outboundTrunk = await lk.createSipOutboundTrunk(
  outboundTrunkName,            // e.g., "ast-outbound-assistant-name-1234567890"
  sipAddress,                   // "pstn.twilio.com"
  [e164],                       // Same phone number for outbound calls
  {
    auth_username: authUsername,    // Twilio Account SID
    auth_password: authPassword,    // Twilio Auth Token
    destination_country: destinationCountry, // "US"
    metadata: JSON.stringify({
      kind: 'per-assistant-outbound-trunk',
      assistantId,
      assistantName,
      phoneNumber: e164,
      createdAt: new Date().toISOString(),
    }),
  }
);
```

#### C. SIP Dispatch Rule
```javascript
const rule = await lk.createSipDispatchRule(
  { type: 'individual', roomPrefix: 'assistant-' },
  {
    name: `assistant:${assistantId}:${Date.now()}`,
    trunkIds: [trunkId],
    inbound_numbers: [],
    inboundNumbers: [],
    roomConfig: {
      agents: [{ agentName, metadata: agentMetadataJson }],
      metadata: agentMetadataJson,
    },
    metadata: JSON.stringify({
      assistantId,
      assistantName,
      trunkId,
      phoneNumber: e164,
    }),
  }
);
```

### 3. Database Mapping (`twilio-admin.js`)

The `/api/v1/twilio/map` endpoint stores:

```javascript
await supa.from('phone_number').upsert({
  phone_sid: phoneSid || null,
  number: e164,
  label: label || null,
  inbound_assistant_id: assistantId,
  outbound_trunk_id: outboundTrunkId || null,      // LiveKit outbound trunk ID
  outbound_trunk_name: outboundTrunkName || null,  // LiveKit outbound trunk name
  webhook_status: 'configured',
  status: 'active',
}, { onConflict: 'number' });
```

### 4. Twilio Configuration

The system also configures Twilio webhooks:

```javascript
await twilio.incomingPhoneNumbers(phoneSid).update({
  smsUrl: baseUrl,
  smsMethod: 'POST',
  statusCallback: baseUrl.replace('/webhook', '/status-callback'),
  statusCallbackMethod: 'POST'
});
```

## Key Configuration Details

### Twilio SIP Configuration
- **SIP Address**: `pstn.twilio.com`
- **Auth Username**: Twilio Account SID
- **Auth Password**: Twilio Auth Token
- **Destination Country**: US (configurable via `SIP_DESTINATION_COUNTRY`)

### LiveKit Trunk Settings
- **Inbound Trunk**: Routes incoming calls to the assistant
- **Outbound Trunk**: Routes outbound calls through Twilio
- **Dispatch Rule**: Routes calls to the correct assistant based on trunk

### Database Storage
- **Phone Number**: E.164 format (+1XXXXXXXXXX)
- **Assistant ID**: Links phone to specific assistant
- **Trunk IDs**: Links to LiveKit trunk configuration
- **Status**: Active/Inactive state

## Troubleshooting Common Issues

### 1. No Outbound Trunk Found
**Error**: "No outbound trunk configured for this assistant"
**Cause**: Phone number not properly assigned or trunk creation failed
**Solution**: Re-assign phone number to assistant

### 2. SIP Call Not Connecting
**Error**: SIP participant created but no call received
**Cause**: Incorrect Twilio credentials or SIP configuration
**Solution**: Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`

### 3. Agent Not Dispatched
**Error**: Agent dispatch fails
**Cause**: LiveKit agent not running or incorrect configuration
**Solution**: Start LiveKit agent with correct environment variables

## Environment Variables Required

```bash
# LiveKit Configuration
LIVEKIT_HOST=wss://your-livekit-server.com
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
SIP_PROVIDER_ADDRESS=pstn.twilio.com
SIP_DESTINATION_COUNTRY=US

# Database
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Verification Steps

1. **Check Trunk Creation**: Verify both inbound and outbound trunks exist in LiveKit
2. **Check Database**: Verify phone number is mapped to assistant with trunk IDs
3. **Check Twilio**: Verify phone number is attached to Twilio trunk
4. **Test Call**: Make a test call to verify end-to-end functionality
