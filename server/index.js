import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';
import { twilioAdminRouter } from './twilio-admin.js';
import { twilioUserRouter } from './twilio-user.js';
import { twilioSmsRouter } from './twilio-sms.js';
import { livekitSipRouter } from './livekit-sip.js';
import { livekitPerAssistantTrunkRouter } from './livekit-per-assistant-trunk.js';
import { livekitOutboundCallsRouter } from './livekit-outbound-calls.js';
import { recordingWebhookRouter } from './recording-webhook.js';
import { getCallRecordingInfo } from './twilio-trunk-service.js';
import smsWebhookRouter from './sms-webhook.js';
import { outboundCallsRouter } from './outbound-calls.js';
import { campaignManagementRouter } from './campaign-management.js';
import { csvManagementRouter } from './csv-management.js';
import { livekitRoomRouter } from './livekit-room.js';
import { campaignEngine } from './campaign-execution-engine.js';
import { connect } from '@ngrok/ngrok';
import knowledgeBaseRouter from './routes/knowledge-base.js';
import supportAccessRouter from './routes/supportAccess.js';
import './workers/supportAccessCleanup.js';





const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/api/v1/twilio', twilioAdminRouter);
app.use('/api/v1/twilio/user', twilioUserRouter);
app.use('/api/v1/twilio/sms', twilioSmsRouter);
app.use('/api/v1/livekit', livekitSipRouter);
app.use('/api/v1/livekit', livekitPerAssistantTrunkRouter);
app.use('/api/v1/livekit', livekitOutboundCallsRouter);
app.use('/api/v1/recording', recordingWebhookRouter);
app.use('/api/v1/sms', smsWebhookRouter);
app.use('/api/v1/outbound-calls', outboundCallsRouter);
app.use('/api/v1/campaigns', campaignManagementRouter);
app.use('/api/v1/csv', csvManagementRouter);
app.use('/api/v1/livekit', livekitRoomRouter);
app.use('/api/v1/knowledge-base', knowledgeBaseRouter);
app.use('/api/v1/support-access', supportAccessRouter);
console.log('Knowledge base routes registered at /api/v1/knowledge-base');
console.log('Support access routes registered at /api/v1/support-access');

// Recording routes (matching voiceagents pattern exactly)

// Get recording information for a call
app.get('/api/v1/call/:callSid/recordings', async (req, res) => {
  try {
    const { callSid } = req.params;
    const { accountSid, authToken } = req.query;

    if (!accountSid || !authToken) {
      return res.status(400).json({
        success: false,
        message: 'accountSid and authToken are required'
      });
    }

    const result = await getCallRecordingInfo({ accountSid, authToken, callSid });
    res.json(result);
  } catch (error) {
    console.error('Error getting call recording info:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Proxy endpoint to serve recording audio files with authentication
app.get('/api/v1/call/recording/:recordingSid/audio', async (req, res) => {
  try {
    const { recordingSid } = req.params;
    const { accountSid, authToken } = req.query;
    
    // Decode URL-encoded parameters
    const decodedAccountSid = decodeURIComponent(accountSid);
    const decodedAuthToken = decodeURIComponent(authToken);

    if (!decodedAccountSid || !decodedAuthToken) {
      return res.status(400).json({
        success: false,
        message: 'accountSid and authToken are required'
      });
    }

    // Construct the Twilio recording URL
    const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${decodedAccountSid}/Recordings/${recordingSid}.wav`;
    
    // Debug: Log credential info
    console.log('Audio request debug:', {
      recordingSid,
      accountSid: decodedAccountSid,
      accountSidLength: decodedAccountSid?.length,
      authTokenLength: decodedAuthToken?.length,
      authTokenPreview: decodedAuthToken?.substring(0, 10) + '...',
      recordingUrl
    });
    
    // Make authenticated request to Twilio
    const response = await fetch(recordingUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${decodedAccountSid}:${decodedAuthToken}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch recording from Twilio:', response.status, response.statusText);
      
      // Get the error response body for better debugging
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.error('Twilio error response:', errorBody);
      } catch (e) {
        console.error('Could not read error response body');
      }
      
      return res.status(response.status).json({
        success: false,
        message: `Failed to fetch recording: ${response.statusText}`,
        error: errorBody
      });
    }

    // Get the audio data as a buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Set appropriate headers for audio streaming
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Send the audio data
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('Error proxying recording audio:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});





const PORT = process.env.PORT || 4000;

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/v1/livekit/create-token', async (req, res) => {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const room = `room-${Math.random().toString(36).slice(2, 8)}`;
    const identity = `identity-${Math.random().toString(36).slice(2, 8)}`;
    const metadata = req.body?.metadata ?? {};

    console.log("LIVEKIT_API_KEY", apiKey)
    console.log("apiSecret", apiSecret)

    const grant = {
      room,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      metadata: JSON.stringify(metadata),
    });
    at.addGrant(grant);
    const jwt = await at.toJwt();

    res.json({
      success: true,
      message: 'Token created successfully',
      result: { identity, accessToken: jwt },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create token' });
  }
});

// Minimal Cal.com setup endpoint: creates an event type and returns its id/slug
app.post('/api/v1/calendar/setup', async (req, res) => {
  try {
    const {
      cal_api_key,
      cal_event_type_slug,
      cal_timezone = 'UTC',
      cal_event_title = 'Assistant Meeting',
      cal_event_length = 30,
    } = req.body || {};

    if (!cal_api_key || !cal_event_type_slug) {
      return res.status(400).json({ success: false, message: 'cal_api_key and cal_event_type_slug are required' });
    }

    const slug = String(cal_event_type_slug)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'voice-agent-meeting';

    const resp = await fetch('https://api.cal.com/v2/event-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cal_api_key}`,
      },
      body: JSON.stringify({
        title: cal_event_title || 'Assistant Meeting',
        slug,
        length: Number(cal_event_length) || 30,
        timeZone: cal_timezone || 'UTC',
      }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      // Bubble up Cal.com error for easier debugging
      return res.status(resp.status).json({ success: false, message: 'Cal.com error', error: data });
    }

    const id = data?.data?.id || data?.id || data?.eventType?.id;
    const retSlug = data?.data?.slug || data?.slug || slug;

    return res.json({ success: true, eventTypeId: String(id), eventTypeSlug: String(retSlug) });
  } catch (err) {
    console.error('Calendar setup failed', err);
    return res.status(500).json({ success: false, message: 'Calendar setup failed' });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Backend running on http://localhost:${PORT}`);

  // Start campaign execution engine
  campaignEngine.start();
  console.log('🚀 Campaign execution engine started');

  // Start ngrok tunnel for Twilio webhooks
  if (process.env.NGROK_AUTHTOKEN) {
    try {
      const listener = await connect({
        addr: PORT,
        authtoken_from_env: true
      });

      console.log(`🌐 ngrok tunnel established at: ${listener.url()}`);
      console.log(`📱 Use this URL for Twilio webhooks: ${listener.url()}/api/v1/twilio/sms/webhook`);
      console.log(`📞 Use this URL for Twilio status callbacks: ${listener.url()}/api/v1/twilio/sms/status-callback`);

      // Store the ngrok URL for use in SMS sending
      process.env.NGROK_URL = listener.url();

      // SMS webhooks are configured automatically when phone numbers are assigned to assistants

    } catch (error) {
      console.error('❌ Failed to start ngrok tunnel:', error.message);
      console.log('💡 Make sure NGROK_AUTHTOKEN is set in your .env file');
    }
  } else {
    console.log('⚠️  NGROK_AUTHTOKEN not set - webhooks will not work with localhost');
    console.log('💡 Add NGROK_AUTHTOKEN to your .env file to enable ngrok tunnel');

    // SMS webhooks are configured automatically when phone numbers are assigned to assistants
  }
});


