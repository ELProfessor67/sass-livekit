# LiveKit Agent Troubleshooting Guide

## Current Issues Identified

Based on your logs, here are the main issues and solutions:

### 1. DNS Resolution Error
**Error**: `socket.gaierror: [Errno 11001] getaddrinfo failed`
**Cause**: The agent cannot resolve `wave-runner-digital-u7hzbsf1.livekit.cloud`

**Solutions**:
- Check your internet connection
- Try using a different DNS server (8.8.8.8, 1.1.1.1)
- Verify the LiveKit URL is correct
- Test connectivity: `ping wave-runner-digital-u7hzbsf1.livekit.cloud`

### 2. Missing Environment Variables
**Error**: Agent cannot connect to LiveKit server
**Cause**: Missing required environment variables

**Solution**: Create a `.env` file with these variables:
```bash
# LiveKit Configuration
LIVEKIT_URL=wss://wave-runner-digital-u7hzbsf1.livekit.cloud
LIVEKIT_HOST=wss://wave-runner-digital-u7hzbsf1.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here

# Agent Configuration
LK_AGENT_NAME=ai

# Backend Configuration
BACKEND_URL=http://localhost:4000
ASSISTANT_RESOLVER_PATH=/api/v1/livekit/assistant

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_LLM_MODEL=gpt-4o-mini
OPENAI_STT_MODEL=gpt-4o-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
SIP_PROVIDER_ADDRESS=pstn.twilio.com
SIP_DESTINATION_COUNTRY=US
```

### 3. Agent Dispatch Error
**Error**: "Body is unusable" and "Agent dispatch error"
**Cause**: Incorrect API endpoint or request format

**Solution**: Fixed in `server/campaign-execution-engine.js` - the dispatch URL now properly converts WSS to HTTPS.

### 4. Worker Connection Issues
**Error**: "worker connection closed unexpectedly"
**Cause**: Network instability or configuration issues

**Solutions**:
- Ensure stable internet connection
- Check LiveKit server status
- Verify credentials are correct
- Restart the agent process

## Step-by-Step Fix

### Step 1: Create Environment File
```bash
# Run the setup script
python setup-livekit-agent.py

# Or manually create .env file with the content above
```

### Step 2: Install Dependencies
```bash
cd livekit
pip install -r requirement.txt
pip install livekit-agents livekit-plugins-openai livekit-plugins-silero python-dotenv
```

### Step 3: Test Connection
```bash
# Test DNS resolution
ping wave-runner-digital-u7hzbsf1.livekit.cloud

# Test with curl
curl -I https://wave-runner-digital-u7hzbsf1.livekit.cloud
```

### Step 4: Start Services
```bash
# Terminal 1: Start backend
npm start

# Terminal 2: Start LiveKit agent
cd livekit
python main.py
```

### Step 5: Test Campaign
1. Create a campaign in the UI
2. Add contacts
3. Start the campaign
4. Check logs for successful agent dispatch

## Common Issues and Solutions

### Issue: "Cannot connect to host"
**Solution**: Check network connectivity and DNS resolution

### Issue: "Agent dispatch failed"
**Solution**: Verify LIVEKIT_API_KEY and LIVEKIT_API_SECRET are correct

### Issue: "OpenAI API key not set"
**Solution**: Add OPENAI_API_KEY to .env file

### Issue: "Supabase credentials not configured"
**Solution**: Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env file

## Debugging Commands

```bash
# Check environment variables
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('LIVEKIT_URL:', os.getenv('LIVEKIT_URL'))"

# Test LiveKit connection
python -c "from livekit import agents; print('LiveKit imported successfully')"

# Check network connectivity
nslookup wave-runner-digital-u7hzbsf1.livekit.cloud
```

## Log Analysis

Look for these success indicators in logs:
- ✅ "Agent dispatched successfully"
- ✅ "PARTICIPANT_CONNECTED"
- ✅ "CALL_START"
- ✅ "registered worker"

Look for these error indicators:
- ❌ "getaddrinfo failed"
- ❌ "worker connection closed unexpectedly"
- ❌ "Agent dispatch failed"
- ❌ "Body is unusable"

## Next Steps

1. Create the .env file with your actual credentials
2. Install missing dependencies
3. Test network connectivity
4. Start the services in the correct order
5. Monitor logs for successful connections

If issues persist, check:
- LiveKit server status
- Network firewall settings
- Credential validity
- Service dependencies
