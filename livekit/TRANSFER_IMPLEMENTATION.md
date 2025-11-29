# Call Transfer Implementation

## Overview
Cold transfer functionality has been implemented to allow AI agents to transfer calls to another phone number using LiveKit SIP REFER.

## Features
- **Cold Transfer Only**: Direct transfer without announcement to receiving party
- **Condition-Based**: Transfer triggers when conversation matches configured condition
- **Custom Transfer Message**: Configurable sentence spoken before transfer
- **Phone Number Support**: Supports international phone numbers with country codes

## Configuration

### Database
Run the SQL migration to add transfer fields to the `assistant` table:
```sql
-- See: supabase/migrations/20250131000005_add_transfer_fields_to_assistant.sql
```

### Frontend
Configure transfer settings in the Assistant Wizard → Advanced Tab:
1. Enable "Enable Call Transfer" toggle
2. Enter transfer phone number (with country code selector)
3. Set transfer sentence (what agent says before transferring)
4. Define transfer condition (when to transfer)

### Backend
Transfer configuration is automatically loaded when creating agents and passed to the `UnifiedAgent`.

## How It Works

1. **Configuration**: User configures transfer settings in the UI
2. **Detection**: Agent monitors conversation for transfer condition
3. **Trigger**: When condition is met, agent calls `transfer_required()` function
4. **Transfer**: System uses LiveKit API to perform SIP REFER transfer
5. **Completion**: Caller is transferred to target number, LiveKit session ends

## LiveKit API Integration

The transfer uses LiveKit's `TransferSIPParticipant` API:

```python
from livekit import api
from livekit.protocol.sip import TransferSIPParticipantRequest

transfer_request = TransferSIPParticipantRequest(
    participant_identity=participant_identity,
    room_name=room_name,
    transfer_to="tel:+15105550100",
    play_dialtone=False  # Cold transfer
)

async with api.LiveKitAPI(url, api_key, api_secret) as livekit_api:
    await livekit_api.sip.transfer_sip_participant(transfer_request)
```

## Twilio Trunk Configuration

**IMPORTANT**: You must enable call transfers on your Twilio SIP trunk for transfers to work.

### Via Twilio Console:
1. Sign in to [Twilio Console](https://console.twilio.com)
2. Navigate to **Elastic SIP Trunking** » **Manage** » **Trunks**
3. Select your trunk
4. In **Features** » **Call Transfer (SIP REFER)** section:
   - Select **Enabled**
   - Choose **Caller ID for Transfer Target** option
   - Select **Enable PSTN Transfer**
   - Save changes

### Via Twilio CLI:
```bash
twilio api trunking v1 trunks update --sid <twilio-trunk-sid> \
  --transfer-mode enable-all \
  --transfer-caller-id from-transferee
```

For more details, see: [Twilio Call Transfer via SIP REFER](https://www.twilio.com/docs/sip-trunking/call-transfer)

## Environment Variables

Ensure these are set in your LiveKit environment:
- `LIVEKIT_URL` - LiveKit server URL
- `LIVEKIT_API_KEY` - LiveKit API key
- `LIVEKIT_API_SECRET` - LiveKit API secret

## Transfer Function

The agent has access to a `transfer_required()` function tool that:
- Validates transfer configuration
- Finds the SIP participant in the room
- Formats the target phone number as `tel:` URI
- Executes the LiveKit transfer API call
- Handles errors gracefully

## Logging

Transfer operations are logged with the following prefixes:
- `TRANSFER_REQUESTED` - Transfer condition detected
- `TRANSFER_INITIATING` - Starting transfer process
- `TRANSFER_SUCCESS` - Transfer completed successfully
- `TRANSFER_ERROR` - Transfer failed (with error details)

## Error Handling

The transfer function handles:
- Missing transfer configuration
- Missing phone number
- Room/participant not available
- Missing LiveKit credentials
- API errors during transfer

On error, the agent informs the caller and resets the transfer flag to allow retry.

## Future Enhancements

- Warm transfer support (announced transfer)
- Transfer to SIP endpoints (not just phone numbers)
- Transfer statistics and tracking
- Multiple transfer targets with routing logic


