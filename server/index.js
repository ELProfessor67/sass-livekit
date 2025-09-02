import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';
import { twilioAdminRouter } from './twilio-admin.js';
import { twilioUserRouter } from './twilio-user.js';
import { livekitSipRouter } from './livekit-sip.js';
import { livekitPerAssistantTrunkRouter } from './livekit-per-assistant-trunk.js';




const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/api/v1/twilio', twilioAdminRouter);
app.use('/api/v1/twilio/user', twilioUserRouter);
app.use('/api/v1/livekit', livekitSipRouter);
app.use('/api/v1/livekit', livekitPerAssistantTrunkRouter);



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

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});


