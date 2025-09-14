# 🚀 Outbound Calls Setup Guide

## **Required Environment Variables**

Add these to your `.env` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890  # Fallback phone number (optional - system will use assistant's assigned number)

# LiveKit Configuration
LIVEKIT_HOST=wss://your-livekit-host.com
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Server Configuration
NGROK_URL=https://your-ngrok-url.ngrok.io  # For webhooks
BACKEND_URL=https://your-domain.com  # Alternative to ngrok
```

## **Twilio Setup Steps**

### 1. **Get Twilio Credentials**
- Sign up at [twilio.com](https://twilio.com)
- Get your Account SID and Auth Token from the console
- Purchase phone numbers and assign them to your assistants (recommended)
- Or set a fallback phone number in `TWILIO_PHONE_NUMBER`

### 2. **Configure Twilio Webhooks**
In your Twilio Console, set up these webhooks:

**For each phone number assigned to assistants:**
- **Voice URL**: `https://your-domain.com/api/v1/livekit/room/{roomName}`
- **Voice Method**: POST
- **Status Callback URL**: `https://your-domain.com/api/v1/outbound-calls/status-callback`
- **Status Callback Method**: POST

**Note**: The system will automatically use the phone number assigned to each assistant. If no phone number is assigned to an assistant, it will fall back to `TWILIO_PHONE_NUMBER`.

### 3. **Enable Call Recording**
- Go to Phone Numbers → Manage → Active Numbers
- Click on your phone number
- Enable "Record calls" and "Record from ringing"
- Set Recording Status Callback: `https://your-domain.com/api/v1/recording/status`

## **LiveKit Setup Steps**

### 1. **Deploy LiveKit Server**
Option A: **Use LiveKit Cloud** (Recommended)
- Sign up at [livekit.io](https://livekit.io)
- Create a new project
- Get your host, API key, and secret

Option B: **Self-host LiveKit**
- Follow the [LiveKit deployment guide](https://docs.livekit.io/deploy/)
- Configure SIP integration for Twilio

### 2. **Configure SIP Trunk**
- In LiveKit Console, go to SIP → Inbound Trunks
- Create a new trunk for Twilio
- Note the SIP URI (you'll need this for Twilio)

### 3. **Set up AI Agent Worker**
- Deploy the LiveKit agent worker (already in your `livekit/` folder)
- Configure it to handle outbound calls
- Set environment variables for your AI service

## **Testing the Setup**

### 1. **Test Twilio Connection**
```bash
curl -X POST https://your-domain.com/api/v1/outbound-calls/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "your-campaign-id",
    "phoneNumber": "+1234567890",
    "assistantId": "your-assistant-id"
  }'
```

### 2. **Test LiveKit Room Creation**
```bash
curl -X POST https://your-domain.com/api/v1/livekit/room/test-room \
  -H "Content-Type: application/json" \
  -d '{
    "assistantId": "your-assistant-id",
    "phoneNumber": "+1234567890"
  }'
```

## **Troubleshooting**

### **Common Issues:**

1. **"No phone number configured"**
   - Make sure `TWILIO_PHONE_NUMBER` is set in your `.env`
   - Verify the phone number format includes country code (+1234567890)

2. **"LiveKit credentials not configured"**
   - Check `LIVEKIT_HOST`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`
   - Ensure LiveKit server is running and accessible

3. **"Webhook URL not accessible"**
   - Make sure `NGROK_URL` or `BACKEND_URL` is set correctly
   - Test webhook URLs are accessible from the internet

4. **Calls not connecting to LiveKit**
   - Verify Twilio webhook URLs are correct
   - Check LiveKit SIP trunk configuration
   - Ensure AI agent worker is running

### **Debug Mode:**
Set `NODE_ENV=development` to see detailed logs of the calling process.

## **Production Considerations**

1. **Use HTTPS** for all webhook URLs
2. **Set up proper error handling** and retry logic
3. **Monitor call quality** and success rates
4. **Implement rate limiting** to avoid spam detection
5. **Set up call analytics** and reporting
6. **Configure proper logging** for debugging

## **Next Steps**

1. Set up all environment variables
2. Configure Twilio webhooks
3. Deploy LiveKit server
4. Test with a single call
5. Create your first campaign
6. Start calling! 🚀
