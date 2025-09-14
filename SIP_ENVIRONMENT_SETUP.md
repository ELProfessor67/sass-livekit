# SIP Environment Variables Setup for Twilio

This document explains the environment variables needed for the outbound trunk functionality with Twilio.

## Required Environment Variables

### LiveKit Configuration
```bash
LIVEKIT_HOST=your-livekit-host
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
```

### Twilio Configuration (Already in your project)
```bash
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890  # Fallback phone number
```

### Twilio SIP Configuration (NEW - Optional)
```bash
# Optional: Override default Twilio SIP settings
SIP_PROVIDER_ADDRESS=your-trunk-sid.pstn.twilio.com  # Optional: specific trunk
SIP_DESTINATION_COUNTRY=US  # Optional: defaults to US
```

**Note**: The system will automatically use your existing Twilio credentials (`TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`) for SIP authentication. You only need to add the SIP-specific variables if you want to override the defaults.

## Environment Variables Explained

### `SIP_PROVIDER_ADDRESS` (Optional)
- **Description**: Twilio trunk-specific SIP address
- **Format**: `{trunk-sid}.pstn.twilio.com`
- **Default**: `pstn.twilio.com` (generic Twilio address)
- **Example**: `TK1234567890abcdef.pstn.twilio.com`

### `SIP_DESTINATION_COUNTRY` (Optional)
- **Description**: Two-letter country code for call routing optimization
- **Examples**: `US`, `CA`, `GB`, `AU`
- **Default**: `US`

### Twilio Authentication (Automatic)
- **Username**: Uses `TWILIO_ACCOUNT_SID` automatically
- **Password**: Uses `TWILIO_AUTH_TOKEN` automatically
- **No additional configuration needed!**

## Setup Instructions

### 1. Your existing `.env` file already has Twilio configuration!
You already have these variables set up:
```bash
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### 2. Add LiveKit configuration (if not already present)
```bash
LIVEKIT_HOST=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

### 3. Optional: Add Twilio trunk-specific SIP address
If you want to use a specific Twilio trunk, add:
```bash
SIP_PROVIDER_ADDRESS=your-trunk-sid.pstn.twilio.com
SIP_DESTINATION_COUNTRY=US
```

### 4. Restart your server
After adding any new environment variables, restart your server.

### 5. Test the setup
1. Assign a phone number to an assistant
2. Check the logs to ensure both inbound and outbound trunks are created successfully
3. The system will automatically use your Twilio credentials for SIP authentication

## Troubleshooting

### Common Issues

1. **"address field is required" error**
   - Ensure `SIP_PROVIDER_ADDRESS` is set in your environment variables
   - Check that the address format is correct (no `sip:` protocol prefix)

2. **Authentication failures**
   - Verify `SIP_AUTH_USERNAME` and `SIP_AUTH_PASSWORD` are correct
   - Check with your SIP provider for the correct credentials

3. **Call routing issues**
   - Verify `SIP_DESTINATION_COUNTRY` is set to the correct country code
   - Check that your SIP provider supports the destination country

### Testing Your Configuration

You can test your SIP configuration by creating a test outbound trunk:

```bash
curl -X POST https://your-livekit-host/twirp/livekit.SIP/CreateSIPOutboundTrunk \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-trunk",
    "address": "sip.telnyx.com",
    "destination_country": "US",
    "numbers": ["+1234567890"],
    "auth_username": "your-username",
    "auth_password": "your-password"
  }'
```

## Provider-Specific Notes

### Telnyx
- Use regional SIP addresses for better performance
- See [Telnyx SIP Signaling Addresses](https://sip.telnyx.com/#signaling-addresses)
- Example addresses:
  - US: `sip.telnyx.com`
  - EU: `sip-eu.telnyx.com`
  - APAC: `sip-ap.telnyx.com`

### Twilio
- Address format: `your-trunk-name.pstn.twilio.com`
- Requires trunk to be created in Twilio Console first
- Authentication credentials are provided by Twilio

### Custom Providers
- Contact your SIP provider for the correct address and authentication details
- Ensure your provider supports the destination countries you plan to call
