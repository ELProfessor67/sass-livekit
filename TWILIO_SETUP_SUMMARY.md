# 🚀 Twilio Outbound Trunk Setup Summary

## ✅ **Good News!** 
Your project already has all the Twilio configuration needed! The system will automatically use your existing Twilio credentials.

## 🔧 **What You Need to Do**

### 1. **Run the Database Migration**
Execute this SQL in your Supabase SQL editor:
```sql
ALTER TABLE public.phone_number 
ADD COLUMN outbound_trunk_id TEXT,
ADD COLUMN outbound_trunk_name TEXT;
```

### 2. **Add LiveKit Configuration** (if not already present)
Add these to your `.env` file:
```bash
LIVEKIT_HOST=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
```

### 3. **Optional: Add Twilio Trunk-Specific Address**
If you want to use a specific Twilio trunk, add:
```bash
SIP_PROVIDER_ADDRESS=your-trunk-sid.pstn.twilio.com
SIP_DESTINATION_COUNTRY=US
```

### 4. **Restart Your Server**
After adding any new environment variables, restart your server.

## 🎯 **How It Works**

1. **When you assign a phone number to an assistant:**
   - ✅ Creates inbound trunk (existing functionality)
   - ✅ **NEW**: Creates outbound trunk using your Twilio credentials
   - ✅ Stores both trunk IDs in the database

2. **When campaign calls are made:**
   - ✅ Uses LiveKit SIP participants instead of direct Twilio calls
   - ✅ Automatically uses the assistant's outbound trunk
   - ✅ Calls are routed through LiveKit with AI agent integration

## 🔍 **Testing**

1. **Assign a phone number** to an assistant
2. **Check the logs** - you should see:
   ```
   [LK-AST] creating outbound trunk :: {"assistantId":"...","outboundTrunkName":"ast-outbound-..."}
   [LK-AST] created outbound trunk :: {"outboundTrunkId":"...","sipAddress":"pstn.twilio.com"}
   ```
3. **Create a campaign** and verify calls use LiveKit SIP

## 🆘 **Troubleshooting**

- **"address field is required" error**: Make sure `LIVEKIT_HOST`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` are set
- **Authentication errors**: Your existing `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are used automatically
- **No outbound trunk found**: Ensure the assistant has a phone number assigned

## 📚 **Documentation**

- `OUTBOUND_TRUNK_IMPLEMENTATION.md` - Complete implementation details
- `SIP_ENVIRONMENT_SETUP.md` - Detailed environment variable setup

---

**That's it!** Your existing Twilio setup will work seamlessly with the new LiveKit SIP outbound calling functionality.
